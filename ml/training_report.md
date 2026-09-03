# AI-Based Irrigation Management System — Training Report
    
**Generated At:** 2026-08-27 17:14:28

## 1. Dataset
* **Dataset Name:** `irrigation_master_dataset_v1.csv`
* **Rows:** 5000
* **Columns:** 26
* **Target:** `water_required_mm` (Derived irrigation depth requirement)
* **Features:** 23 variables: crop_type, crop_growth_stage, soil_type, soil_ph, soil_moisture, organic_carbon, electrical_conductivity, N, P, K, temperature_c, humidity, rainfall_mm, sunlight_hours, wind_speed_kmh, season, irrigation_type, water_source, field_area_hectare, mulching_used, previous_irrigation_mm, region, ET_index

## 2. Preprocessing
* **Missing values:** Handled via median imputation for numerical columns and mode imputation for categorical columns.
* **Encoding:** Categorical variables encoded using LabelEncoder on the training split.
* **Scaling:** Numerical features scaled using StandardScaler on the training split.
* **Train/Test split:** 80% training and 20% testing subsets with `random_state=42`.

## 3. Models
* **XGBoost:** `XGBRegressor`
* **Random Forest:** `RandomForestRegressor`
* **Gradient Boosting:** `GradientBoostingRegressor`
* **LSTM:** Sequential Long Short-Term Memory Network.

## 4. Results
| Model | R² Score | MAE | RMSE | Training Time | Prediction Time | Model Size |
|---|---|---|---|---|---|---|
| Random Forest | 0.9344 | 4.4554 | 7.7746 | 0.93 s | 0.1002 ms | 10458.5 KB |
| Gradient Boosting | 0.9659 | 3.5304 | 5.6037 | 5.31 s | 0.0152 ms | 424.3 KB |
| XGBoost | 0.9612 | 3.5971 | 5.9816 | 0.67 s | 0.0104 ms | 277.6 KB |
| LSTM | -0.0000 | 23.2807 | 31.3277 | 13.51 s | 0.8999 ms | 319.4 KB |

## 5. LSTM
* **Status:** Success
* **R²:** -0.0000
* **MAE:** 23.2807
* **RMSE:** 31.3277
* **Training Time:** 13.51 s
* **Model Size:** 319.4 KB
* **Explanation:** LSTM trained successfully with sequential sequence windowing.

## 6. Model Comparison
Please refer to the table above for R², MAE, RMSE, and processing time benchmarks.

## 7. Manual Production Selection
The final production model is selected manually by an authorized mentor/admin after reviewing benchmark results.
