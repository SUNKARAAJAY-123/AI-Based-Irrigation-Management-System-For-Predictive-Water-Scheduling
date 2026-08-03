import os
import pickle
import numpy as np
import subprocess
import sys
HAS_TENSORFLOW = False
try:
    import tensorflow as tf
    HAS_TENSORFLOW = True
except ImportError:
    print("Warning: TensorFlow is not installed. LSTM model will use local drift forecast fallback.")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "../models")

# Global variables for loaded models
_CROP_ENCODER = None
_RF_CLASSIFIER = None
_RF_REGRESSOR = None
_RF_RISK_CLASSIFIER = None
_LSTM_MODEL = None

def run_training_if_missing():
    required_files = ["crop_encoder.pkl", "rf_classifier.pkl", "rf_regressor.pkl", "rf_risk_classifier.pkl"]
    missing = [f for f in required_files if not os.path.exists(os.path.join(MODELS_DIR, f))]
    
    # Also check LSTM models (either .h5 or .keras)
    lstm_h5 = os.path.exists(os.path.join(MODELS_DIR, "lstm_moisture.h5"))
    lstm_keras = os.path.exists(os.path.join(MODELS_DIR, "lstm_moisture.keras"))
    
    if missing or (HAS_TENSORFLOW and not lstm_h5 and not lstm_keras):
        print("ML model files are missing. Running train.py to generate models...")
        train_script = os.path.join(os.path.dirname(__file__), "../training/train.py")
        res = subprocess.run([sys.executable, train_script], capture_output=True, text=True)
        if res.returncode != 0:
            print("Auto-training failed:")
            print(res.stderr)
        else:
            print("Auto-training finished successfully.")

def load_models():
    global _CROP_ENCODER, _RF_CLASSIFIER, _RF_REGRESSOR, _RF_RISK_CLASSIFIER, _LSTM_MODEL
    
    run_training_if_missing()
    
    # Load scikit-learn models
    try:
        if _CROP_ENCODER is None:
            with open(os.path.join(MODELS_DIR, "crop_encoder.pkl"), "rb") as f:
                _CROP_ENCODER = pickle.load(f)
        if _RF_CLASSIFIER is None:
            with open(os.path.join(MODELS_DIR, "rf_classifier.pkl"), "rb") as f:
                _RF_CLASSIFIER = pickle.load(f)
        if _RF_REGRESSOR is None:
            with open(os.path.join(MODELS_DIR, "rf_regressor.pkl"), "rb") as f:
                _RF_REGRESSOR = pickle.load(f)
        if _RF_RISK_CLASSIFIER is None:
            with open(os.path.join(MODELS_DIR, "rf_risk_classifier.pkl"), "rb") as f:
                _RF_RISK_CLASSIFIER = pickle.load(f)
    except Exception as e:
        print(f"Error loading scikit-learn models: {e}")
        
    # Load LSTM model
    if _LSTM_MODEL is None and HAS_TENSORFLOW:
        lstm_path = os.path.join(MODELS_DIR, "lstm_moisture.h5")
        if not os.path.exists(lstm_path):
            lstm_path = os.path.join(MODELS_DIR, "lstm_moisture.keras")
            
        if os.path.exists(lstm_path):
            try:
                # Disable compile to avoid any optimizer loading errors
                _LSTM_MODEL = tf.keras.models.load_model(lstm_path, compile=False)
            except Exception as e:
                print(f"Error loading LSTM model: {e}")
        else:
            print("No LSTM model weights found.")

def predict_irrigation(crop_name: str, soil_moisture: float, temperature: float, humidity: float, wind_speed: float, rainfall_prob: float):
    """
    Inference endpoint returning:
    - is_irrigation_required: bool
    - recommended_water_volume_liters: float
    - risk_level: str ('low', 'medium', 'high')
    - confidence_score: float
    """
    load_models()
    
    # Fallback default values if models aren't loaded
    if _RF_CLASSIFIER is None or _CROP_ENCODER is None:
        # Rule-based fallback
        thresholds = {"Wheat": 35, "Rice": 50, "Cotton": 30, "Maize": 35, "Tomato": 40}
        thresh = thresholds.get(crop_name, 35)
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
        
    # 1. Encode crop
    try:
        crop_encoded = _CROP_ENCODER.transform([crop_name])[0]
    except Exception:
        # Default crop if unseen
        crop_encoded = _CROP_ENCODER.transform(["Wheat"])[0]
        
    # Prepare features
    features = np.array([[crop_encoded, soil_moisture, temperature, humidity, wind_speed, rainfall_prob]])
    
    # 2. Predict irrigation requirement
    is_req = _RF_CLASSIFIER.predict(features)[0]
    proba = _RF_CLASSIFIER.predict_proba(features)[0]
    confidence = float(max(proba))
    
    # 3. Predict volume
    vol = _RF_REGRESSOR.predict(features)[0]
    if not is_req:
        vol = 0.0
        
    # 4. Predict risk level
    risk_idx = _RF_RISK_CLASSIFIER.predict(features)[0]
    risk_mapping = {0: "low", 1: "medium", 2: "high"}
    risk_level = risk_mapping.get(risk_idx, "low")
    
    return {
        "is_irrigation_required": bool(is_req == 1),
        "recommended_water_volume_liters": max(0.0, round(float(vol), 2)),
        "risk_level": risk_level,
        "confidence_score": round(confidence, 3),
        "model_type": "random_forest"
    }


def adjust_irrigation_for_weather(prediction: dict, weather_data: dict) -> dict:
    """Apply transparent, weather-based safeguards to an ML recommendation."""
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
    Forecasting using LSTM model. Expects a sequence of 10 values.
    Returns predicted next soil moisture value (%).
    """
    load_models()
    
    if _LSTM_MODEL is None:
        # Fallback simple exponential smoothing / drift prediction
        if not moisture_sequence:
            return 35.0
        # If sequence exists, continue the trend slightly
        if len(moisture_sequence) >= 2:
            trend = moisture_sequence[-1] - moisture_sequence[-2]
        else:
            trend = -0.2
        return max(0.0, min(100.0, moisture_sequence[-1] + trend))
        
    # Standardize input
    if len(moisture_sequence) < 10:
        # Pad with the first value if too short
        moisture_sequence = [moisture_sequence[0]] * (10 - len(moisture_sequence)) + moisture_sequence
    elif len(moisture_sequence) > 10:
        moisture_sequence = moisture_sequence[-10:]
        
    # Normalize between 0 and 100
    seq = np.array(moisture_sequence) / 100.0
    seq_reshaped = np.reshape(seq, (1, 10, 1))
    
    # Predict
    pred_norm = _LSTM_MODEL.predict(seq_reshaped, verbose=0)[0][0]
    pred = pred_norm * 100.0
    
    return max(0.0, min(100.0, float(pred)))
