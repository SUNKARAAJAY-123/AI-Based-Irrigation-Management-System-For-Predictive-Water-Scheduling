import os
import json
import pickle
import numpy as np
import pandas as pd
import logging
import time
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Cache for loaded artifacts
_PREPROCESSING_ARTIFACTS = None
_LOADED_MODELS = {}

ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(ML_DIR, "models")

# Global variables for compatibility
_CROP_ENCODER = None
_RF_CLASSIFIER = None
_RF_REGRESSOR = None
_RF_RISK_CLASSIFIER = None
_LSTM_MODEL = None

HAS_TENSORFLOW = False
try:
    import tensorflow as tf
    HAS_TENSORFLOW = True
except ImportError:
    pass

def get_production_model_name() -> str:
    """
    Reads the active production model from production_model.json.
    Defaults to 'xgboost'.
    """
    config_path = os.path.join(ML_DIR, "production_model.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                data = json.load(f)
                return data.get("model", data.get("production_model", "xgboost"))
        except Exception:
            pass
    return "xgboost"

def load_preprocessing_artifacts() -> dict:
    """
    Loads and caches preprocessing artifacts (scaler, encoders, feature columns).
    """
    global _PREPROCESSING_ARTIFACTS
    if _PREPROCESSING_ARTIFACTS is not None:
        return _PREPROCESSING_ARTIFACTS
        
    logger.info("Loading ML preprocessing artifacts...")
    artifacts = {}
    
    try:
        encoders_path = os.path.join(ML_DIR, "encoder.pkl")
        scaler_path = os.path.join(ML_DIR, "scaler.pkl")
        features_path = os.path.join(ML_DIR, "feature_columns.pkl")
        
        if os.path.exists(encoders_path) and os.path.exists(scaler_path) and os.path.exists(features_path):
            with open(encoders_path, "rb") as f:
                artifacts["encoders"] = pickle.load(f)
            with open(scaler_path, "rb") as f:
                artifacts["scaler"] = pickle.load(f)
            with open(features_path, "rb") as f:
                artifacts["feature_columns"] = pickle.load(f)
                
            _PREPROCESSING_ARTIFACTS = artifacts
            logger.info("ML preprocessing artifacts loaded successfully.")
            return artifacts
    except Exception as e:
        logger.error(f"Error loading preprocessing artifacts: {e}")
    return {}

def run_training_if_missing():
    """
    Auto-train models if missing on startup.
    """
    rf_pkl = os.path.exists(os.path.join(MODELS_DIR, "random_forest", "model.pkl"))
    gb_pkl = os.path.exists(os.path.join(MODELS_DIR, "gradient_boosting", "model.pkl"))
    xgb_pkl = os.path.exists(os.path.join(MODELS_DIR, "xgboost", "model.pkl"))
    lstm_keras = os.path.exists(os.path.join(MODELS_DIR, "lstm", "model.keras"))
    
    if not (rf_pkl and gb_pkl and xgb_pkl and lstm_keras):
        logger.info("ML model files are missing. Running train.py to generate models...")
        try:
            from ml.train import train_and_compare
            train_and_compare()
            logger.info("Auto-training finished successfully.")
        except Exception as e:
            logger.error(f"Auto-training failed: {e}")

def load_models():
    """
    Loads and caches model weights. Called by FastAPI lifespan.
    """
    global _CROP_ENCODER, _RF_CLASSIFIER, _RF_REGRESSOR, _RF_RISK_CLASSIFIER, _LSTM_MODEL, _LOADED_MODELS
    
    run_training_if_missing()
    load_preprocessing_artifacts()
    
    # Cache all models
    valid_models = ["random_forest", "gradient_boosting", "xgboost", "lstm"]
    for m in valid_models:
        get_model(m)
        
    try:
        # Load legacy variables for telemetry checks
        if _RF_REGRESSOR is None:
            reg_path = os.path.join(MODELS_DIR, "rf_regressor.pkl")
            if os.path.exists(reg_path):
                with open(reg_path, "rb") as f:
                    _RF_REGRESSOR = pickle.load(f)
                    
        if _CROP_ENCODER is None:
            crop_path = os.path.join(MODELS_DIR, "crop_encoder.pkl")
            if os.path.exists(crop_path):
                with open(crop_path, "rb") as f:
                    _CROP_ENCODER = pickle.load(f)
    except Exception as e:
        logger.error(f"Error loading compatibility models: {e}")

def get_model(model_name: str):
    """
    Loads and caches a specific model by name.
    """
    global _LOADED_MODELS
    name_clean = model_name.lower().replace(" ", "_")
    if name_clean in _LOADED_MODELS:
        return _LOADED_MODELS[name_clean]
        
    model_path = None
    if name_clean == "random_forest":
        model_path = os.path.join(MODELS_DIR, "random_forest", "model.pkl")
    elif name_clean == "gradient_boosting":
        model_path = os.path.join(MODELS_DIR, "gradient_boosting", "model.pkl")
    elif name_clean == "xgboost":
        model_path = os.path.join(MODELS_DIR, "xgboost", "model.pkl")
    elif name_clean == "lstm":
        model_path = os.path.join(MODELS_DIR, "lstm", "model.keras")
        
    if model_path and os.path.exists(model_path):
        try:
            if name_clean == "lstm":
                import tensorflow as tf
                model_obj = tf.keras.models.load_model(model_path)
            else:
                with open(model_path, "rb") as f:
                    model_obj = pickle.load(f)
            _LOADED_MODELS[name_clean] = model_obj
            logger.info(f"Loaded and cached model: {model_name} from {model_path}")
            return model_obj
        except Exception as e:
            logger.error(f"Error loading model {model_name} from {model_path}: {e}")
            
    return None

def predict_water_requirement(
    temperature: float,
    humidity: float,
    rainfall: float,
    soil_moisture: float,
    crop: str,
    soil_type: str,
    model: str = None,
    **kwargs
) -> dict:
    """
    Unified prediction method for continuous water requirements.
    Uses target models with standard transformations.
    """
    load_models()
    pre_artifacts = load_preprocessing_artifacts()
    selected_model_name = model if model else get_production_model_name()
    model_obj = get_model(selected_model_name)
    
    if not pre_artifacts:
        raise ValueError("ML preprocessing artifacts are missing. Please execute training first.")
        
    if model_obj is None:
        raise ValueError(f"Requested ML model '{selected_model_name}' is not trained or available.")
        
    try:
        encoders = pre_artifacts["encoders"]
        scaler = pre_artifacts["scaler"]
        feature_columns = pre_artifacts["feature_columns"]
        defaults = encoders.get("__defaults__", {})
        
        # Standard variables mapping
        temp_val = temperature
        hum_val = humidity
        rain_val = rainfall
        moist_val = soil_moisture
        crop_val = crop
        soil_val = soil_type

        # Build feature dict matching feature columns order
        input_dict = {}
        for col in feature_columns:
            if col == 'ET_index':
                input_dict['ET_index'] = (temp_val * 0.7) - (hum_val * 0.2)
            elif col == 'temperature_c':
                input_dict[col] = temp_val
            elif col == 'humidity':
                input_dict[col] = hum_val
            elif col == 'rainfall_mm':
                input_dict[col] = rain_val
            elif col == 'soil_moisture':
                input_dict[col] = moist_val
            elif col == 'crop_type':
                input_dict[col] = crop_val
            elif col == 'soil_type':
                input_dict[col] = soil_val
            elif col in kwargs:
                input_dict[col] = kwargs[col]
            else:
                input_dict[col] = defaults.get(col)
                
        # Encode categorical columns in the dict first to avoid pandas dtype conflicts
        for col in feature_columns:
            if col in encoders and col != "__defaults__":
                le = encoders[col]
                val = str(input_dict[col])
                known_classes = set(le.classes_)
                if val not in known_classes:
                    val = le.classes_[0]
                input_dict[col] = int(le.transform([val])[0])
                
        input_df = pd.DataFrame([input_dict])
        input_df = input_df[feature_columns]
                
        # Scale numeric inputs
        from ml.preprocessing import scale_features
        scaled_cols = list(scaler.feature_names_in_)
        input_scaled, _ = scale_features(input_df, is_training=False, scaler=scaler, num_cols=scaled_cols)
        
        # Run prediction
        t_start = time.time()
        if selected_model_name == "lstm":
            # Replicate 2D input (1, num_features) to 3D sequence (1, 10, num_features)
            input_values = input_scaled.values
            input_3d = np.repeat(input_values[:, np.newaxis, :], 10, axis=1)
            pred_val = model_obj.predict(input_3d)[0][0]
        else:
            pred_val = model_obj.predict(input_scaled)[0]
        water_required = max(0.0, round(float(pred_val), 2))
        pred_time_ms = (time.time() - t_start) * 1000
        
        # Parse recommendation strings
        if water_required == 0.0:
            rec = "No irrigation needed"
        elif water_required <= 8.0:
            rec = "Irrigate lightly"
        elif water_required <= 20.0:
            rec = "Irrigate today"
        else:
            rec = "Irrigate heavily"
            
        display_name = selected_model_name.replace("_", " ").title()
        if display_name == "Xgboost":
            display_name = "XGBoost"
            
        return {
            "water_required": water_required,
            "recommendation": rec,
            "confidence": 0.0,  # Regression model does not provide valid uncertainty estimate
            "model_type": selected_model_name,
            "prediction_time_ms": round(pred_time_ms, 3),
            "display_name": display_name
        }
    except Exception as e:
        logger.error(f"Error during model inference: {e}")
        raise e

def predict_irrigation(
    crop_name: str, 
    soil_moisture: float, 
    temperature: float, 
    humidity: float, 
    wind_speed: float, 
    rainfall_prob: float
) -> dict:
    """
    Compatibility wrapper returning:
    - is_irrigation_required: bool
    - recommended_water_volume_liters: float
    - risk_level: str ('low', 'medium', 'high')
    - confidence_score: float
    """
    load_models()
    
    thresholds = {"Wheat": 35, "Rice": 50, "Cotton": 30, "Maize": 35, "Tomato": 40}
    thresh = thresholds.get(crop_name, 35)
    
    if _RF_REGRESSOR is None:
        is_req = soil_moisture < thresh and rainfall_prob < 0.5
        vol = (thresh - soil_moisture) * 2.5 * (1.0 + max(0, temperature - 25) * 0.04) if is_req else 0.0
        risk = "high" if soil_moisture < (thresh - 15) else ("medium" if soil_moisture < thresh else "low")
        return {
            "is_irrigation_required": bool(is_req),
            "recommended_water_volume_liters": max(0.0, round(vol, 2)),
            "risk_level": risk,
            "confidence_score": 0.85,
            "model_type": "rule_based_fallback"
        }
        
    try:
        if _CROP_ENCODER is not None:
            try:
                crop_encoded = _CROP_ENCODER.transform([crop_name])[0]
            except Exception:
                crop_encoded = _CROP_ENCODER.transform(["Wheat"])[0]
        else:
            crop_encoded = 0
            
        features = np.array([[crop_encoded, soil_moisture, temperature, humidity, wind_speed, rainfall_prob]])
        prod_model_name = get_production_model_name()
        
        # Legacy mock using Random Forest Regressor
        vol = _RF_REGRESSOR.predict(features)[0]
        vol = max(0.0, float(vol))
        is_req = 1 if (vol > 0.5 or soil_moisture < thresh) else 0
        confidence = 0.95
        if not is_req:
            vol = 0.0
            
        if soil_moisture < (thresh - 15):
            risk_level = "high"
        elif soil_moisture < thresh:
            risk_level = "medium"
        else:
            risk_level = "low"
            
        return {
            "is_irrigation_required": bool(is_req == 1),
            "recommended_water_volume_liters": max(0.0, round(float(vol), 2)),
            "risk_level": risk_level,
            "confidence_score": round(confidence, 3),
            "model_type": prod_model_name
        }
    except Exception as e:
        logger.error(f"Error during legacy telemetry model inference: {e}")
        is_req = soil_moisture < thresh and rainfall_prob < 0.5
        vol = (thresh - soil_moisture) * 2.5 if is_req else 0.0
        risk = "high" if soil_moisture < (thresh - 15) else ("medium" if soil_moisture < thresh else "low")
        return {
            "is_irrigation_required": bool(is_req),
            "recommended_water_volume_liters": max(0.0, round(vol, 2)),
            "risk_level": risk,
            "confidence_score": 0.75,
            "model_type": "telemetry_error_fallback"
        }

def adjust_irrigation_for_weather(prediction: dict, weather_data: dict) -> dict:
    """
    Adjusts predictions based on weather parameters.
    """
    adjusted = prediction.copy()
    hourly = weather_data.get("hourly", [])[:24]
    rain_probability = max((float(item.get("rain_probability", 0)) for item in hourly), default=0.0)
    humidity = float(weather_data.get("humidity", 0))
    temperature = float(weather_data.get("temp", 0))
    wind_speed = float(weather_data.get("wind_speed", 0))
    multiplier = 1.0
    reasons = []

    if rain_probability >= 0.7:
        multiplier *= 0.25
        reasons.append("heavy rain is expected in the next 24 hours")
    elif rain_probability >= 0.5:
        multiplier *= 0.5
        reasons.append("rain is likely in the next 24 hours")
    if humidity >= 85:
        multiplier *= 0.8
        reasons.append("high humidity reduces evaporation")
    if temperature >= 35:
        multiplier *= 1.2
        reasons.append("high temperature increases evaporation")

    adjusted["recommended_water_volume_liters"] = round(
        max(0.0, float(prediction["recommended_water_volume_liters"]) * multiplier), 2
    )
    adjusted["weather_adjustment"] = {
        "rain_probability_next_24h": round(rain_probability, 2),
        "volume_multiplier": round(multiplier, 2),
        "reasons": reasons,
        "recommended_window": "early morning or evening" if temperature >= 35 or wind_speed >= 25 else "standard schedule",
    }
    if multiplier != 1:
        adjusted["model_type"] = f"{prediction['model_type']}_weather_adjusted"
    return adjusted

def forecast_soil_moisture(moisture_sequence: list) -> float:
    """
    Forecasts next-hour soil moisture level using a linear trend calculation.
    """
    if not moisture_sequence:
        return 35.0
    if len(moisture_sequence) >= 2:
        trend = moisture_sequence[-1] - moisture_sequence[-2]
    else:
        trend = -0.2
    return max(0.0, min(100.0, moisture_sequence[-1] + trend))
