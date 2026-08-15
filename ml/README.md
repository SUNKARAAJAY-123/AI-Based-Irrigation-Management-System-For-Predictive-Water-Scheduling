# AI-Based Irrigation Management - Machine Learning Module

This directory contains the machine learning pipeline for predicting irrigation water requirements (in mm or liters per square meter) based on weather forecasts, soil telemetry, and crop characteristics.

## 🏗️ Folder Structure

```text
ml/
├── lstm/                         # Placeholder sub-module for future LSTM sequence modeling
│   ├── preprocess_sequence.py    # Sequence window generation and normalization utilities
│   ├── train_lstm.py             # Keras sequential LSTM network training logic
│   └── predict_lstm.py           # Time-series multi-step inference loader
├── models/                       # Serialized weights, encodings, and scalers (.pkl, .json, .h5)
│   ├── crop_encoder.pkl          # Dedicated Crop LabelEncoder for backend compatibility
│   ├── encoder.pkl               # Full dictionary of categorical LabelEncoders
│   ├── scaler.pkl                # fitted StandardScaler for numerical attributes
│   ├── feature_columns.pkl       # List of features used in the trained models
│   ├── irrigation_model.pkl      # Production Random Forest Regressor
│   └── model_metadata.json       # Statistics, timestamp, and metrics of the saved model
├── eda_plots/                    # Visualizations exported during dataset analysis (EDA)
│   ├── target_distribution.png
│   ├── correlation_heatmap.png
│   ├── numerical_histograms.png
│   ├── numerical_boxplots.png
│   ├── crop_irrigation_need.png
│   └── soil_irrigation_need.png
├── evaluation_results/           # Visualizations of model regression performance
│   ├── prediction_vs_actual.png  # Regressor fit plot
│   ├── residual_plot.png         # Error residuals plot
│   └── feature_importance.png    # Relative feature importances of best model
├── data_loader.py                # Dataset CSV loader
├── preprocessing.py              # Data cleaning, outlier clipping, scaling, and validation
├── feature_engineering.py        # EVT index and continuous target variable calculator
├── train.py                      # Main training orchestrator
├── evaluate.py                   # Regression metrics evaluator (R², MAE, RMSE)
├── tuning.py                     # GridSearchCV Random Forest hyperparameter tuner
├── predict.py                    # Production prediction wrapper for backend API
└── eda.py                        # Dataset EDA script
```

## 📊 Dataset & Target Engineering

The pipeline trains on the **Kaggle Irrigation Water Requirement Prediction Dataset** (`D:\Infosys 7.0\archive\irrigation_prediction.csv`), which consists of 10,000 samples and 20 features detailing:
- **Environmental**: Temperature (°C), Humidity (%), Rainfall (mm), Wind Speed (km/h), Sunlight Hours.
- **Soil**: Soil Type (Clay, Sandy, Loamy, Silt), pH level, Moisture (VWC %), Organic Carbon, Electrical Conductivity.
- **Crop**: Crop Type, Growth Stage, Season.

### Target Engineering
The original dataset has `Irrigation_Need` as a categorical column (`Low`, `Medium`, `High`). 
To enable precision regression forecasting, we engineer a continuous target variable `water_required` (representing required water in mm or L/m²) using a formula combining:
- Crop base transpiration demand (e.g. Rice: 1.4x, Cotton: 0.7x).
- Soil drainage property coefficient (e.g. Sandy: 1.2x, Clay: 0.8x).
- Soil moisture deficit.
- Ambient Temperature and Humidity evapotranspiration (ET) multipliers.
- Real-world normal variance noise.

---

## 🚀 Model Training & Evaluation

To run the training pipeline, make sure your `.venv` is active and execute:
```bash
python ml/train.py
```
This script automatically:
1. Loads, cleans, and validates the dataset.
2. Performs IQR outlier clipping and scales numerical attributes.
3. Fits Label Encoders and StandardScalers.
4. Trains multiple regression models (Random Forest, Gradient Boosting, Extra Trees).
5. Compares performance.
6. Performs a **GridSearchCV** hyperparameter tuning sweep on the Random Forest regressor:
   - `n_estimators`: `[50, 100]`
   - `max_depth`: `[10, 20, None]`
   - `min_samples_split`: `[2, 5]`
   - `min_samples_leaf`: `[1, 2]`
7. Retrains the optimal estimator and serializes all models, scaler coefficients, and feature encoders.

### Performance Summary
The Random Forest model reaches high predictive precision under evaluation:
- **$R^2$ Score**: ~0.95+
- **Mean Absolute Error (MAE)**: < 1.1 mm
- **Root Mean Squared Error (RMSE)**: < 1.4 mm

---

## 🔌 API Documentation

### **POST** `/api/ml/predict`
Predicts the required irrigation volume based on current field parameters.

#### **Request Body**
```json
{
  "temperature": 32.0,
  "humidity": 74.0,
  "rainfall": 15.0,
  "soil_moisture": 42.0,
  "crop": "Rice",
  "soil_type": "Clay"
}
```

#### **Response Body**
```json
{
  "water_required": 18.6,
  "recommendation": "Irrigate today",
  "confidence": 96.2
}
```

---

## 🔮 Future Improvements (LSTM Module)
The `ml/lstm/` subdirectory prepares the system for deep-learning-based time-series forecasting. Once historical, sequential hourly soil moisture log streams are available from IoT sensors:
1. Soil moisture sequence arrays can be windowed (e.g., past 10 readings) and fed to the Keras LSTM network.
2. The network will project future moisture curves, allowing early scheduling warnings before crops undergo water stress.
