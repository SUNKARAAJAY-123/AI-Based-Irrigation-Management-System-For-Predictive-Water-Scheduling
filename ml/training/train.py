import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

HAS_TENSORFLOW = False
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense
    HAS_TENSORFLOW = True
except ImportError:
    print("Warning: TensorFlow is not installed. Skipping LSTM model training.")

# Create models directory if it doesn't exist
MODELS_DIR = os.path.join(os.path.dirname(__file__), "../models")
os.makedirs(MODELS_DIR, exist_ok=True)

def generate_classification_data():
    print("Generating synthetic crop telemetry data for Random Forest training...")
    np.random.seed(42)
    n_samples = 1500
    
    crops = ["Wheat", "Rice", "Cotton", "Maize", "Tomato"]
    crop_list = np.random.choice(crops, n_samples)
    
    # Soil moisture (VWC %)
    soil_moisture = np.random.uniform(15, 80, n_samples)
    # Ambient Temperature (°C)
    temperature = np.random.uniform(10, 45, n_samples)
    # Ambient Humidity (%)
    humidity = np.random.uniform(30, 95, n_samples)
    # Wind Speed (km/h)
    wind_speed = np.random.uniform(0, 30, n_samples)
    # Rainfall probability (0 to 1)
    rainfall_prob = np.random.uniform(0, 1, n_samples)
    
    df = pd.DataFrame({
        "crop": crop_list,
        "soil_moisture": soil_moisture,
        "temperature": temperature,
        "humidity": humidity,
        "wind_speed": wind_speed,
        "rainfall_prob": rainfall_prob
    })
    
    # Define rules for target variable: is_irrigation_required
    # Irrigation required if:
    # 1. Soil moisture is below crop-specific threshold (Wheat: 35, Rice: 50, Cotton: 30, Maize: 35, Tomato: 40)
    # 2. AND rainfall probability is low (< 0.4)
    thresholds = {"Wheat": 35, "Rice": 50, "Cotton": 30, "Maize": 35, "Tomato": 40}
    irrigation_required = []
    water_volume = []
    risk_level = []
    
    for idx, row in df.iterrows():
        thresh = thresholds[row["crop"]]
        moisture = row["soil_moisture"]
        temp = row["temperature"]
        rain = row["rainfall_prob"]
        
        # Determine irrigation
        needs_water = False
        if moisture < thresh:
            # If rain is likely, we might skip
            if rain < 0.5:
                needs_water = True
            elif moisture < (thresh - 10): # Way too dry, irrigate anyway
                needs_water = True
                
        irrigation_required.append(1 if needs_water else 0)
        
        # Calculate water volume (Liters per square meter)
        if needs_water:
            # Deficit + temperature factor
            base_vol = (thresh - moisture) * 2.5
            temp_mult = 1.0 + (max(0, temp - 25) * 0.04) # 4% more water per degree above 25°C
            vol = base_vol * temp_mult
            water_volume.append(round(vol, 2))
        else:
            water_volume.append(0.0)
            
        # Determine risk level
        if moisture < (thresh - 15):
            risk = 2 # High risk (severely under-irrigated)
        elif moisture < thresh:
            risk = 1 # Medium risk (moderately dry)
        else:
            risk = 0 # Low risk (optimal)
        risk_level.append(risk)
        
    df["is_irrigation_required"] = irrigation_required
    df["recommended_water_volume"] = water_volume
    df["risk_level"] = risk_level
    
    return df

def train_random_forest(df):
    print("Training Random Forest Models...")
    
    # Label encode crops
    le = LabelEncoder()
    df["crop_encoded"] = le.fit_transform(df["crop"])
    
    # Save label encoder
    encoder_path = os.path.join(MODELS_DIR, "crop_encoder.pkl")
    with open(encoder_path, "wb") as f:
        pickle.dump(le, f)
    print(f"Crop Label Encoder saved to {encoder_path}")
    
    X = df[["crop_encoded", "soil_moisture", "temperature", "humidity", "wind_speed", "rainfall_prob"]]
    
    # 1. Irrigation Classifier
    clf_irrigation = RandomForestClassifier(n_estimators=100, random_state=42)
    clf_irrigation.fit(X, df["is_irrigation_required"])
    clf_path = os.path.join(MODELS_DIR, "rf_classifier.pkl")
    with open(clf_path, "wb") as f:
        pickle.dump(clf_irrigation, f)
    print(f"Irrigation Classifier saved to {clf_path}")
    
    # 2. Water Volume Regressor (train only on samples that need irrigation or keep all)
    reg_volume = RandomForestRegressor(n_estimators=100, random_state=42)
    reg_volume.fit(X, df["recommended_water_volume"])
    reg_path = os.path.join(MODELS_DIR, "rf_regressor.pkl")
    with open(reg_path, "wb") as f:
        pickle.dump(reg_volume, f)
    print(f"Water Regressor saved to {reg_path}")
    
    # 3. Risk Level Classifier
    clf_risk = RandomForestClassifier(n_estimators=100, random_state=42)
    clf_risk.fit(X, df["risk_level"])
    risk_path = os.path.join(MODELS_DIR, "rf_risk_classifier.pkl")
    with open(risk_path, "wb") as f:
        pickle.dump(clf_risk, f)
    print(f"Risk Classifier saved to {risk_path}")

def generate_lstm_data():
    print("Generating sequence data for LSTM training...")
    np.random.seed(42)
    # Simulate drying and irrigation cycle for soil moisture
    timesteps = 1000
    moisture = 70.0
    series = []
    
    for i in range(timesteps):
        # Default dry rate
        dry_rate = np.random.uniform(0.1, 0.4)
        # Random hot weather increases dry rate
        if np.random.rand() > 0.8:
            dry_rate += 0.3
            
        moisture -= dry_rate
        
        # Simulated irrigation trigger
        if moisture < 30:
            moisture = np.random.uniform(75, 85)
            
        # Add sensor noise
        noise = np.random.normal(0, 0.5)
        series.append(max(0, min(100, moisture + noise)))
        
    return np.array(series)

def train_lstm(series):
    if not HAS_TENSORFLOW:
        print("Skipping LSTM training (TensorFlow not installed). Using local prediction model for forecasting.")
        return
    print("Training TensorFlow LSTM model for soil moisture forecasting...")
    
    # Prepare sequence windows (X: past 10 steps, y: next step)
    window_size = 10
    X, y = [], []
    for i in range(len(series) - window_size):
        X.append(series[i : i + window_size])
        y.append(series[i + window_size])
        
    X = np.array(X)
    y = np.array(y)
    
    # Reshape input to [samples, timesteps, features] for LSTM
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    # Normalize features between 0 and 1
    max_val = 100.0
    X_norm = X / max_val
    y_norm = y / max_val
    
    # Build LSTM Model
    model = Sequential([
        LSTM(32, input_shape=(window_size, 1), return_sequences=False),
        Dense(16, activation="relu"),
        Dense(1)
    ])
    
    model.compile(optimizer="adam", loss="mse")
    
    # Train for 5 epochs
    model.fit(X_norm, y_norm, epochs=5, batch_size=32, verbose=1)
    
    # Save the LSTM model
    lstm_path = os.path.join(MODELS_DIR, "lstm_moisture.h5")
    try:
        model.save(lstm_path)
        print(f"LSTM model saved successfully to {lstm_path}")
    except Exception as e:
        print(f"Failed to save as H5, attempting standard keras format: {e}")
        lstm_path_keras = os.path.join(MODELS_DIR, "lstm_moisture.keras")
        model.save(lstm_path_keras)
        print(f"LSTM model saved successfully to {lstm_path_keras}")

def main():
    print("--- Starting ML Pipeline Training ---")
    df = generate_classification_data()
    train_random_forest(df)
    
    series = generate_lstm_data()
    train_lstm(series)
    print("--- ML Model Training Complete! ---")

if __name__ == "__main__":
    main()
