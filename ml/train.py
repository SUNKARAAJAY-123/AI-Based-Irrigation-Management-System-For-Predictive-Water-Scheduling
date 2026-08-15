import os
import sys
import time
import json
import pickle
import logging
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("MLTrainPipeline")

# Import modular helper functions
from ml.data_loader import load_raw_data
from ml.preprocessing import clean_data, handle_outliers, engineer_features, encode_features, scale_features, validate_data
from ml.evaluate import evaluate_model

ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(ML_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)
STATUS_FILE = os.path.join(MODELS_DIR, "training_status.json")

def update_status(status, current_model="", progress=0, log_msg=None, error=None, results=None):
    """
    Saves the training status to a JSON file so that FastAPI can read it asynchronously.
    """
    data = {
        "status": status,
        "current_model": current_model,
        "progress": progress,
        "updated_at": datetime.now().isoformat(),
        "error": error,
        "results": results or []
    }
    
    existing_logs = []
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                old_data = json.load(f)
                existing_logs = old_data.get("logs", [])
        except Exception:
            pass
            
    if log_msg:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        existing_logs.append(f"[{timestamp}] {log_msg}")
        logger.info(log_msg)
        
    data["logs"] = existing_logs
    
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def check_timeseries_structure(df: pd.DataFrame) -> tuple:
    """
    Checks if the dataset contains valid temporal indicators.
    """
    indicators = ['timestamp', 'date', 'datetime', 'time', 'created_at', 'reading_time', 'field_id']
    found_cols = [col for col in df.columns if col.lower() in indicators]
    
    has_time = any(c.lower() in ['timestamp', 'date', 'datetime', 'time', 'created_at', 'reading_time'] for c in df.columns)
    has_field = any(c.lower() == 'field_id' for c in df.columns)
    
    if has_time and has_field:
        return True, f"Found valid temporal columns and field sequence mapping: {found_cols}."
        
    return False, "Insufficient chronological/time-series data"


def get_model_size_kb(filepath: str) -> float:
    """
    Returns model file size in kilobytes.
    """
    if os.path.exists(filepath):
        size_bytes = os.path.getsize(filepath)
        return round(size_bytes / 1024.0, 2)
    return 0.0

def train_and_compare(dataset_path: str = "datasets/irrigation_master_dataset_v1.csv", user_weights: dict = None):
    """
    Unified training pipeline: loads master dataset, preprocesses features, splits data,
    trains and compares RF, GB, and XGBoost, evaluates metrics, saves artifacts and reports.
    """
    results = []
    
    # Initialize Status
    if os.path.exists(STATUS_FILE):
        try:
            os.remove(STATUS_FILE)
        except Exception:
            pass
            
    update_status("preparing_data", progress=5, log_msg="Initializing training & comparison pipeline...")
    
    try:
        # 1. Load Dataset
        update_status("preparing_data", progress=10, log_msg=f"Loading dataset from {dataset_path}...")
        raw_df = load_raw_data(dataset_path)
        rows, cols = raw_df.shape
        update_status("preparing_data", progress=15, log_msg=f"Successfully loaded dataset: {rows} rows, {cols} columns.")
        
        # 2. Check for LSTM compatibility (temporal check)
        is_timeseries, ts_explanation = check_timeseries_structure(raw_df)
        update_status("preparing_data", progress=20, log_msg=f"Time-series validation: {ts_explanation}")
        
        # 3. Clean and preprocess data
        update_status("preparing_data", progress=25, log_msg="Cleaning dataset and handling outliers...")
        cleaned_df = clean_data(raw_df)
        
        # Required core features to check validity
        required_cols = ['soil_type', 'temperature_c', 'humidity', 'rainfall_mm', 'soil_moisture', 'crop_type']
        if not validate_data(cleaned_df, required_cols):
            raise ValueError("Dataset validation failed. Missing required columns.")
            
        # Target column setup
        target_col = 'water_required_mm'
        
        # Determine features (excluding target and any leakage proxy columns, as well as temporal columns)
        leakage_cols = ['water_required_mm', 'irrigation_need']
        temporal_cols = ['timestamp', 'date', 'datetime', 'time', 'created_at', 'reading_time', 'field_id']
        feature_cols = [col for col in cleaned_df.columns if col not in leakage_cols and col.lower() not in temporal_cols]
        
        logger.info(f"Target variable: {target_col}")
        logger.info(f"Feature variables ({len(feature_cols)}): {feature_cols}")
        
        # Clip outliers on all numerical features
        num_cols = cleaned_df[feature_cols].select_dtypes(include=[np.number]).columns.tolist()
        cleaned_df = handle_outliers(cleaned_df, num_cols)
        
        # 4. Feature Engineering
        update_status("preparing_data", progress=30, log_msg="Engineering ET_index index...")
        engineered_df = engineer_features(cleaned_df, is_training=True)
        
        # Update feature columns list to include ET_index
        if 'ET_index' in engineered_df.columns and 'ET_index' not in feature_cols:
            feature_cols.append('ET_index')
            
        X = engineered_df[feature_cols].copy()
        y = engineered_df[target_col].copy()
        
        # 5. Split Dataset into Train/Test FIRST to avoid Data Leakage
        update_status("preparing_data", progress=35, log_msg="Splitting data into 80/20 train/test sets to prevent leakage...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Compute defaults from training split for prediction fallback
        feature_defaults = {}
        for col in feature_cols:
            if col in X_train.select_dtypes(include=[np.number]).columns:
                feature_defaults[col] = float(X_train[col].median())
            else:
                feature_defaults[col] = str(X_train[col].mode()[0])
        logger.info(f"Computed feature defaults for prediction: {feature_defaults}")
        
        # Fit Preprocessing Objects ONLY on training data splits
        X_train_encoded, encoders = encode_features(X_train, is_training=True)
        X_test_encoded, _ = encode_features(X_test, is_training=False, encoders=encoders)
        
        # Save defaults inside the encoders dictionary
        encoders["__defaults__"] = feature_defaults
        
        # Scale numerical features strictly on training split
        num_cols_to_scale = X_train_encoded.select_dtypes(include=[np.number]).columns.tolist()
        X_train_scaled, scaler = scale_features(X_train_encoded, is_training=True, num_cols=num_cols_to_scale)
        X_test_scaled, _ = scale_features(X_test_encoded, is_training=False, scaler=scaler, num_cols=num_cols_to_scale)
        
        # Save Preprocessing objects directly to ml/ directory
        with open(os.path.join(ML_DIR, "encoder.pkl"), "wb") as f:
            pickle.dump(encoders, f)
        with open(os.path.join(ML_DIR, "scaler.pkl"), "wb") as f:
            pickle.dump(scaler, f)
        with open(os.path.join(ML_DIR, "feature_columns.pkl"), "wb") as f:
            pickle.dump(list(X_train_scaled.columns), f)
            
        # Save Crop label encoder explicitly for backend compatibility
        if 'crop_type' in encoders:
            with open(os.path.join(MODELS_DIR, "crop_encoder.pkl"), "wb") as f:
                pickle.dump(encoders['crop_type'], f)
                
        update_status("preparing_data", progress=40, log_msg="Data preparation complete. Starting model training...")
        
        # ======================================================================
        # 1. RANDOM FOREST
        # ======================================================================
        model_name = "Random Forest"
        update_status("training", current_model=model_name, progress=45, log_msg=f"Training {model_name}...")
        
        t_start = time.time()
        rf = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train_scaled, y_train)
        rf_train_time = time.time() - t_start
        
        # Evaluate
        rf_metrics = evaluate_model(rf, X_test_scaled, y_test)
        rf_metrics.update({
            "name": model_name,
            "training_time": round(rf_train_time, 4),
            "status": "success",
            "explanation": "Random Forest Regressor trained successfully."
        })
        
        # Save Random Forest Model
        rf_dir = os.path.join(MODELS_DIR, "random_forest")
        os.makedirs(rf_dir, exist_ok=True)
        rf_model_path = os.path.join(rf_dir, "model.pkl")
        with open(rf_model_path, "wb") as f:
            pickle.dump(rf, f)
            
        rf_metrics["model_size_kb"] = get_model_size_kb(rf_model_path)
        results.append(rf_metrics)
        update_status("training", current_model=model_name, progress=60, log_msg=f"Finished training {model_name} (R²={rf_metrics['r2']:.4f}).")
        
        # Compatibility Safeguard
        # Save a duplicate to MODELS_DIR as rf_regressor.pkl for legacy code
        with open(os.path.join(MODELS_DIR, "rf_regressor.pkl"), "wb") as f:
            pickle.dump(rf, f)

        # ======================================================================
        # 2. GRADIENT BOOSTING
        # ======================================================================
        model_name = "Gradient Boosting"
        update_status("training", current_model=model_name, progress=65, log_msg=f"Training {model_name}...")
        
        t_start = time.time()
        gb = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        gb.fit(X_train_scaled, y_train)
        gb_train_time = time.time() - t_start
        
        # Evaluate
        gb_metrics = evaluate_model(gb, X_test_scaled, y_test)
        gb_metrics.update({
            "name": model_name,
            "training_time": round(gb_train_time, 4),
            "status": "success",
            "explanation": "Gradient Boosting Regressor trained successfully."
        })
        
        # Save GB Model
        gb_dir = os.path.join(MODELS_DIR, "gradient_boosting")
        os.makedirs(gb_dir, exist_ok=True)
        gb_model_path = os.path.join(gb_dir, "model.pkl")
        with open(gb_model_path, "wb") as f:
            pickle.dump(gb, f)
            
        gb_metrics["model_size_kb"] = get_model_size_kb(gb_model_path)
        results.append(gb_metrics)
        update_status("training", current_model=model_name, progress=75, log_msg=f"Finished training {model_name} (R²={gb_metrics['r2']:.4f}).")

        # ======================================================================
        # 3. XGBOOST
        # ======================================================================
        model_name = "XGBoost"
        update_status("training", current_model=model_name, progress=80, log_msg=f"Training {model_name}...")
        
        t_start = time.time()
        xgb = XGBRegressor(
            n_estimators=100,
            learning_rate=0.08,
            max_depth=5,
            random_state=42
        )
        xgb.fit(X_train_scaled, y_train)
        xgb_train_time = time.time() - t_start
        
        xgb_eval = evaluate_model(xgb, X_test_scaled, y_test)
        xgb_metrics = {
            "name": model_name,
            "training_time": round(xgb_train_time, 4),
            "status": "success",
            "explanation": "XGBoost Regressor trained successfully."
        }
        xgb_metrics.update(xgb_eval)
        
        # Save XGBoost Model
        xgb_dir = os.path.join(MODELS_DIR, "xgboost")
        os.makedirs(xgb_dir, exist_ok=True)
        xgb_model_path = os.path.join(xgb_dir, "model.pkl")
        with open(xgb_model_path, "wb") as f:
            pickle.dump(xgb, f)
            
        xgb_metrics["model_size_kb"] = get_model_size_kb(xgb_model_path)
        results.append(xgb_metrics)
        update_status("training", current_model=model_name, progress=88, log_msg=f"Finished training {model_name} (R²={xgb_metrics['r2']:.4f}).")

        # Compatibility Safeguard
        # Save a duplicate to MODELS_DIR as irrigation_model.pkl for legacy code
        with open(os.path.join(MODELS_DIR, "irrigation_model.pkl"), "wb") as f:
            pickle.dump(xgb, f)

        # ======================================================================
        # 4. LSTM (Check compatibility & Train)
        # ======================================================================
        model_name = "LSTM"
        update_status("training", current_model=model_name, progress=90, log_msg=f"Preparing data for {model_name} sequence training...")
        
        if is_timeseries:
            try:
                import tensorflow as tf
                from tensorflow.keras.models import Sequential
                from tensorflow.keras.layers import LSTM, Dense, Dropout
                from tensorflow.keras.callbacks import EarlyStopping
                
                # 1. Sort by timestamp to ensure chronological order
                raw_df_sorted = raw_df.sort_values(by='timestamp').copy()
                
                # Preprocess the entire chronological series
                cleaned_df_sorted = clean_data(raw_df_sorted)
                
                # Handle outliers on numerical columns
                cleaned_df_sorted = handle_outliers(cleaned_df_sorted, num_cols)
                
                # Feature engineering (ET_index)
                engineered_df_sorted = engineer_features(cleaned_df_sorted, is_training=False)
                
                # Target and features setup
                X_all = engineered_df_sorted[feature_cols].copy()
                y_all = engineered_df_sorted[target_col].copy()
                
                # Encode & Scale features using already fitted preprocessing objects
                X_all_encoded, _ = encode_features(X_all, is_training=False, encoders=encoders)
                X_all_scaled, _ = scale_features(X_all_encoded, is_training=False, scaler=scaler, num_cols=num_cols_to_scale)
                
                # Create sliding window sequences
                time_steps = 10
                Xs, ys = [], []
                for i in range(len(X_all_scaled) - time_steps):
                    Xs.append(X_all_scaled.iloc[i : (i + time_steps)].values)
                    ys.append(y_all.iloc[i + time_steps])
                
                Xs = np.array(Xs)
                ys = np.array(ys)
                
                # Chronological split: 80% train, 20% validation
                split_idx = int(len(Xs) * 0.8)
                X_train_lstm, X_test_lstm = Xs[:split_idx], Xs[split_idx:]
                y_train_lstm, y_test_lstm = ys[:split_idx], ys[split_idx:]
                
                # Define sequential LSTM architecture
                n_features = X_train_lstm.shape[2]
                lstm_model = Sequential([
                    LSTM(64, input_shape=(time_steps, n_features), return_sequences=False),
                    Dropout(0.2),
                    Dense(32, activation='relu'),
                    Dense(1)
                ])
                
                lstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
                
                # Train model
                update_status("training", current_model=model_name, progress=92, log_msg=f"Training {model_name} sequential model...")
                t_start = time.time()
                early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
                
                lstm_model.fit(
                    X_train_lstm, y_train_lstm,
                    validation_data=(X_test_lstm, y_test_lstm),
                    epochs=10,
                    batch_size=32,
                    callbacks=[early_stop],
                    verbose=0
                )
                lstm_train_time = time.time() - t_start
                
                # Evaluate model
                update_status("training", current_model=model_name, progress=95, log_msg=f"Evaluating {model_name} predictions...")
                t_start_pred = time.time()
                y_pred_lstm = lstm_model.predict(X_test_lstm).flatten()
                pred_time_total = time.time() - t_start_pred
                pred_time_ms = (pred_time_total / len(X_test_lstm)) * 1000
                
                # Metrics calculation
                from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
                r2 = float(r2_score(y_test_lstm, y_pred_lstm))
                mae = float(mean_absolute_error(y_test_lstm, y_pred_lstm))
                mse = float(mean_squared_error(y_test_lstm, y_pred_lstm))
                rmse = float(np.sqrt(mse))
                
                # Save LSTM Model
                lstm_dir = os.path.join(MODELS_DIR, "lstm")
                os.makedirs(lstm_dir, exist_ok=True)
                lstm_model_path = os.path.join(lstm_dir, "model.keras")
                lstm_model.save(lstm_model_path)
                
                lstm_metrics = {
                    "name": model_name,
                    "r2": round(r2, 4),
                    "mae": round(mae, 4),
                    "rmse": round(rmse, 4),
                    "mse": round(mse, 4),
                    "training_time": round(lstm_train_time, 4),
                    "prediction_time_ms": round(pred_time_ms, 5),
                    "model_size_kb": get_model_size_kb(lstm_model_path),
                    "status": "success",
                    "explanation": "LSTM trained successfully with sequential sequence windowing."
                }
                
                update_status("training", current_model=model_name, progress=97, log_msg=f"Finished training {model_name} (R²={r2:.4f}).")
                
            except Exception as e:
                logger.error(f"Failed to train LSTM model: {e}")
                lstm_metrics = {
                    "name": model_name,
                    "r2": None,
                    "mae": None,
                    "rmse": None,
                    "mse": None,
                    "training_time": None,
                    "prediction_time_ms": None,
                    "model_size_kb": None,
                    "status": "failed",
                    "explanation": f"Failed to train LSTM model: {str(e)}"
                }
        else:
            lstm_metrics = {
                "name": model_name,
                "r2": None,
                "mae": None,
                "rmse": None,
                "mse": None,
                "training_time": None,
                "prediction_time_ms": None,
                "model_size_kb": None,
                "status": "not_applicable",
                "explanation": ts_explanation
            }
            
        results.append(lstm_metrics)

        # ======================================================================
        # 5. BEST MODEL SELECTION & ARTIFACTS
        # ======================================================================
        update_status("evaluating", progress=98, log_msg="Evaluating and comparing models...")
        
        active_models = [r for r in results if r["status"] == "success"]
        if not active_models:
            raise RuntimeError("No models trained successfully.")
            
        # Compute normalized scores and identify winner models
        r2_vals = [r["r2"] for r in active_models]
        mae_vals = [r["mae"] for r in active_models]
        rmse_vals = [r["rmse"] for r in active_models]
        train_time_vals = [r["training_time"] for r in active_models]
        pred_time_vals = [r["prediction_time_ms"] for r in active_models]
        size_vals = [r["model_size_kb"] for r in active_models]

        min_r2, max_r2 = min(r2_vals), max(r2_vals)
        min_mae, max_mae = min(mae_vals), max(mae_vals)
        min_rmse, max_rmse = min(rmse_vals), max(rmse_vals)
        min_train, max_train = min(train_time_vals), max(train_time_vals)
        min_pred, max_pred = min(pred_time_vals), max(pred_time_vals)
        min_size, max_size = min(size_vals), max(size_vals)

        def norm_higher(val, min_v, max_v):
            if max_v == min_v:
                return 1.0
            return (val - min_v) / (max_v - min_v)

        def norm_lower(val, min_v, max_v):
            if max_v == min_v:
                return 1.0
            return (max_v - val) / (max_v - min_v)

        model_overall_scores = {}
        model_predictive_perf = {}

        # 60% predictive performance (R2=20%, MAE=20%, RMSE=20%), 25% speed (training_time=10%, prediction_time=15%), 15% model size
        for r in active_models:
            name_key = r["name"].lower().replace(" ", "_")
            n_r2 = norm_higher(r["r2"], min_r2, max_r2)
            n_mae = norm_lower(r["mae"], min_mae, max_mae)
            n_rmse = norm_lower(r["rmse"], min_rmse, max_rmse)
            n_train = norm_lower(r["training_time"], min_train, max_train)
            n_pred = norm_lower(r["prediction_time_ms"], min_pred, max_pred)
            n_size = norm_lower(r["model_size_kb"], min_size, max_size)

            pred_score = (n_r2 + n_mae + n_rmse) / 3.0
            model_predictive_perf[name_key] = pred_score

            overall = (0.20 * n_r2 + 0.20 * n_mae + 0.20 * n_rmse + 0.10 * n_train + 0.15 * n_pred + 0.15 * n_size) * 100
            model_overall_scores[name_key] = round(overall, 2)

        # Select winners based on normalized active models
        best_predictive_model_key = max(model_predictive_perf, key=model_predictive_perf.get)
        best_predictive_model = [r["name"] for r in active_models if r["name"].lower().replace(" ", "_") == best_predictive_model_key][0]

        fastest_model_item = min(active_models, key=lambda x: x["prediction_time_ms"])
        fastest_model = fastest_model_item["name"]

        lowest_error_model_item = min(active_models, key=lambda x: x["mae"])
        lowest_error_model = lowest_error_model_item["name"]

        best_overall_model_key = max(model_overall_scores, key=model_overall_scores.get)
        best_overall_model = [r["name"] for r in active_models if r["name"].lower().replace(" ", "_") == best_overall_model_key][0]

        # Read selected production model if exists
        prod_model_name = None
        prod_config_path = os.path.join(ML_DIR, "production_model.json")
        if os.path.exists(prod_config_path):
            try:
                with open(prod_config_path, "r", encoding="utf-8") as f:
                    prod_model_name = json.load(f).get("model")
            except Exception:
                pass

        # Write comparison output to ml/model_comparison.json
        models_comparison_dict = {}
        for m in results:
            name_key = m["name"].lower().replace(" ", "_")
            if m["status"] == "success":
                models_comparison_dict[name_key] = {
                    "name": m["name"],
                    "r2": m["r2"],
                    "mae": m["mae"],
                    "rmse": m["rmse"],
                    "training_time_seconds": m["training_time"],
                    "prediction_time_ms": m["prediction_time_ms"],
                    "model_size_kb": m["model_size_kb"],
                    "overall_score": model_overall_scores.get(name_key, 0.0),
                    "status": "evaluated"
                }
            else:
                models_comparison_dict[name_key] = {
                    "name": m["name"],
                    "status": "not_applicable",
                    "reason": m["explanation"]
                }

        comparison_data = {
            "dataset": os.path.basename(dataset_path),
            "target": target_col,
            "results": models_comparison_dict,
            "best_predictive_model": best_predictive_model,
            "fastest_model": fastest_model,
            "lowest_error_model": lowest_error_model,
            "best_overall_model": best_overall_model,
            "production_model": prod_model_name,
            "production_selection_mode": "manual"
        }

        with open(os.path.join(ML_DIR, "model_comparison.json"), "w", encoding="utf-8") as f:
            json.dump(comparison_data, f, indent=4)
            
        # Ensure production_model.json exists and defaults to xgboost with technical fields only
        prod_config_path = os.path.join(ML_DIR, "production_model.json")
        if not os.path.exists(prod_config_path):
            prod_config = {
                "model": "xgboost",
                "version": "1.0",
                "status": "production"
            }
            with open(prod_config_path, "w", encoding="utf-8") as f:
                json.dump(prod_config, f, indent=4)
                
        # Create training_metadata.json
        metadata_config = {
            "dataset": os.path.basename(dataset_path),
            "target": target_col,
            "train_size": len(X_train),
            "test_size": len(X_test),
            "random_state": 42,
            "features": feature_cols,
            "target_type": "derived"
        }
        with open(os.path.join(ML_DIR, "training_metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata_config, f, indent=4)
            
        # Generate training_report.md
        report_path = os.path.join(ML_DIR, "training_report.md")
        generate_training_report_md(report_path, raw_df, results, feature_cols)
        
        # Print Training Summary to Console
        print_console_summary(os.path.basename(dataset_path), rows, len(feature_cols), target_col, results)
        
        update_status(
            "completed", 
            progress=100, 
            log_msg="Pipeline training completed successfully!",
            results=results
        )
        
    except Exception as e:
        import traceback
        err_msg = f"Training pipeline failed: {e}\n{traceback.format_exc()}"
        logger.error(err_msg)
        update_status("failed", error=str(e), log_msg=f"Training pipeline error: {e}")
        raise e

def print_console_summary(dataset_name, rows, feature_count, target_col, results):
    """
    Prints a clean console summary as specified in STEP 21.
    """
    summary = f"""
========================================
IRRIGATION ML TRAINING COMPLETE
========================================

Dataset:
{dataset_name}

Rows:
{rows}

Features:
{feature_count}

Target:
{target_col}

----------------------------------------
MODEL RESULTS
----------------------------------------
"""
    for m in results:
        summary += f"\n{m['name']}\n"
        if m["status"] == "success":
            summary += f"R²: {m['r2']}\n"
            summary += f"MAE: {m['mae']}\n"
            summary += f"RMSE: {m['rmse']}\n"
            summary += f"Training Time: {m['training_time']} s\n"
            summary += f"Prediction Time: {m['prediction_time_ms']} ms\n"
        else:
            summary += f"Status: {m['status']}\n"
            summary += f"Reason: {m['explanation']}\n"
            
    summary += """
----------------------------------------
PRODUCTION MODEL
----------------------------------------

Manual Selection Required

========================================
"""
    print(summary)

def generate_training_report_md(report_path: str, df: pd.DataFrame, results: list, features: list):
    rows, cols = df.shape
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    table_rows = []
    for r in results:
        if r["status"] == "success":
            table_rows.append(
                f"| {r['name']} | {r['r2']:.4f} | {r['mae']:.4f} | {r['rmse']:.4f} | {r['training_time']:.2f} s | {r['prediction_time_ms']:.4f} ms | {r['model_size_kb']:.1f} KB |"
            )
        else:
            table_rows.append(
                f"| {r['name']} | N/A | N/A | N/A | N/A | N/A | N/A |"
            )
    table_header = "| Model | R² Score | MAE | RMSE | Training Time | Prediction Time | Model Size |\n|---|---|---|---|---|---|---|"
    table_content = table_header + "\n" + "\n".join(table_rows)
    
    lstm_info = "Not Applicable (no temporal indices present)."
    lstm_status_section = """## 5. LSTM
* **Status:** Not Applicable — insufficient temporal data
* **Reason:** The master dataset does not contain chronological observation variables like timestamp or field sequence ids."""

    for r in results:
        if r["name"] == "LSTM" and r["status"] == "success":
            lstm_info = "Sequential Long Short-Term Memory Network."
            lstm_status_section = f"""## 5. LSTM
* **Status:** Success
* **R²:** {r['r2']:.4f}
* **MAE:** {r['mae']:.4f}
* **RMSE:** {r['rmse']:.4f}
* **Training Time:** {r['training_time']:.2f} s
* **Model Size:** {r['model_size_kb']:.1f} KB
* **Explanation:** LSTM trained successfully with sequential sequence windowing."""
            break
            
    report_md = f"""# AI-Based Irrigation Management System — Training Report
    
**Generated At:** {now_str}

## 1. Dataset
* **Dataset Name:** `irrigation_master_dataset_v1.csv`
* **Rows:** {rows}
* **Columns:** {cols}
* **Target:** `water_required_mm` (Derived irrigation depth requirement)
* **Features:** {len(features)} variables: {', '.join(features)}

## 2. Preprocessing
* **Missing values:** Handled via median imputation for numerical columns and mode imputation for categorical columns.
* **Encoding:** Categorical variables encoded using LabelEncoder on the training split.
* **Scaling:** Numerical features scaled using StandardScaler on the training split.
* **Train/Test split:** 80% training and 20% testing subsets with `random_state=42`.

## 3. Models
* **XGBoost:** `XGBRegressor`
* **Random Forest:** `RandomForestRegressor`
* **Gradient Boosting:** `GradientBoostingRegressor`
* **LSTM:** {lstm_info}

## 4. Results
{table_content}

{lstm_status_section}

## 6. Model Comparison
Please refer to the table above for R², MAE, RMSE, and processing time benchmarks.

## 7. Manual Production Selection
The final production model is selected manually by an authorized mentor/admin after reviewing benchmark results.
"""
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_md)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="datasets/irrigation_master_dataset_v1.csv")
    args = parser.parse_args()
    
    train_and_compare(args.dataset)
