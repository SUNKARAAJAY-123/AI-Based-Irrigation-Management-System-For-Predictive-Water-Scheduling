import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
import logging
import pickle
import os

logger = logging.getLogger(__name__)

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Handles missing values and removes duplicate rows.
    """
    initial_rows = len(df)
    
    # 1. Duplicate Removal
    df = df.drop_duplicates().reset_index(drop=True)
    duplicated_rows = initial_rows - len(df)
    if duplicated_rows > 0:
        logger.info(f"Removed {duplicated_rows} duplicate rows.")
        
    # 2. Missing Value Imputation
    # For numerical columns, impute with median
    num_cols = df.select_dtypes(include=[np.number]).columns
    for col in num_cols:
        if df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            logger.info(f"Imputed missing values in numerical column '{col}' with median: {median_val}")
            
    # For categorical columns, impute with mode
    cat_cols = df.select_dtypes(include=['object']).columns
    for col in cat_cols:
        if df[col].isnull().sum() > 0:
            mode_val = df[col].mode()[0]
            df[col] = df[col].fillna(mode_val)
            logger.info(f"Imputed missing values in categorical column '{col}' with mode: {mode_val}")
            
    return df

def handle_outliers(df: pd.DataFrame, columns: list) -> pd.DataFrame:
    """
    Detects and handles outliers by clipping them using the IQR method.
    """
    df_clean = df.copy()
    for col in columns:
        if col not in df_clean.columns:
            continue
        Q1 = df_clean[col].quantile(0.25)
        Q3 = df_clean[col].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        
        # Clip values to lie within IQR bounds
        count_before = ((df_clean[col] < lower_bound) | (df_clean[col] > upper_bound)).sum()
        df_clean[col] = np.clip(df_clean[col], lower_bound, upper_bound)
        if count_before > 0:
            logger.info(f"Clipped {count_before} outlier values in '{col}' to range [{lower_bound:.2f}, {upper_bound:.2f}]")
            
    return df_clean

def engineer_features(df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
    """
    Performs feature engineering:
    - Calculates evapotranspiration index (ET_index)
    """
    df_feats = df.copy()
    
    # Calculate evapotranspiration index (ET_index) as a proxy feature
    # Support both uppercase/lowercase for safety
    temp_col = 'temperature_c' if 'temperature_c' in df_feats.columns else 'Temperature_C'
    hum_col = 'humidity' if 'humidity' in df_feats.columns else 'Humidity'
    
    if temp_col in df_feats.columns and hum_col in df_feats.columns:
        df_feats['ET_index'] = (df_feats[temp_col] * 0.7) - (df_feats[hum_col] * 0.2)
        logger.info("Engineered feature 'ET_index'.")
    else:
        logger.warning("Could not engineer 'ET_index' due to missing temperature/humidity columns.")
        
    return df_feats

def encode_features(df: pd.DataFrame, is_training: bool = True, encoders: dict = None) -> tuple:
    """
    Encodes categorical features using LabelEncoder.
    """
    df_encoded = df.copy()
    
    # Define mapping to standardize column names if they are different (e.g. crop vs crop_type)
    col_mapping = {
        'crop': 'crop_type',
        'crop_type': 'crop_type',
        'soil_type': 'soil_type'
    }
    for old_col, new_col in col_mapping.items():
        if old_col in df_encoded.columns and new_col not in df_encoded.columns:
            df_encoded = df_encoded.rename(columns={old_col: new_col})
            
    # Categorical columns are non-numeric
    cat_cols = df_encoded.select_dtypes(include=['object']).columns.tolist()
    
    if is_training:
        encoders = {}
        for col in cat_cols:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
            encoders[col] = le
            logger.info(f"Fitted LabelEncoder for column '{col}'")
    else:
        if not encoders:
            raise ValueError("Encoders dictionary must be provided for inference encoding.")
        for col in encoders.keys():
            if col == "__defaults__":
                continue
            if col in df_encoded.columns:
                le = encoders[col]
                known_classes = set(le.classes_)
                df_encoded[col] = df_encoded[col].astype(str).apply(lambda x: x if x in known_classes else le.classes_[0])
                df_encoded[col] = le.transform(df_encoded[col])
                
    # Restore original column names for inference/pipeline compatibility if they were different
    if 'crop_type' in df_encoded.columns and 'crop' in df.columns:
        df_encoded = df_encoded.rename(columns={'crop_type': 'crop'})
    if 'soil_type' in df_encoded.columns and 'soil_type' in df.columns:
        df_encoded = df_encoded.rename(columns={'soil_type': 'soil_type'})
        
    return df_encoded, encoders

def scale_features(df: pd.DataFrame, is_training: bool = True, scaler: StandardScaler = None, num_cols: list = None) -> tuple:
    """
    Scales numerical features using StandardScaler.
    """
    df_scaled = df.copy()
    
    if num_cols is None:
        # Scale all numerical columns
        num_cols = df_scaled.select_dtypes(include=[np.number]).columns.tolist()
        
    # Exclude target/id fields from scaling if they accidentally got passed
    exclude_cols = ['water_required_mm', 'water_required', 'id', 'field_id']
    available_cols = [col for col in num_cols if col in df_scaled.columns and col not in exclude_cols]
    
    if len(available_cols) > 0:
        if is_training:
            scaler = StandardScaler()
            df_scaled[available_cols] = scaler.fit_transform(df_scaled[available_cols])
            logger.info(f"Fitted StandardScaler on columns: {available_cols}")
        else:
            if not scaler:
                raise ValueError("Scaler must be provided for inference scaling.")
            df_scaled[available_cols] = scaler.transform(df_scaled[available_cols])
            
    return df_scaled, scaler

def validate_data(df: pd.DataFrame, required_cols: list) -> bool:
    """
    Validates data presence and basic schemas.
    """
    normalized_df_cols = [c.lower() for c in df.columns]
    missing_cols = [col for col in required_cols if col.lower() not in normalized_df_cols]
    if missing_cols:
        logger.error(f"Validation failed. Missing required columns: {missing_cols}")
        return False
        
    # Check data ranges
    for c in df.columns:
        if c.lower() in ['soil_moisture', 'soil_moisture_history']:
            invalid_moisture = ((df[c] < 0) | (df[c] > 100)).sum()
            if invalid_moisture > 0:
                logger.warning(f"Found {invalid_moisture} rows with invalid {c} values.")
                
        if c.lower() == 'soil_ph':
            invalid_ph = ((df[c] < 0) | (df[c] > 14)).sum()
            if invalid_ph > 0:
                logger.warning(f"Found {invalid_ph} rows with invalid Soil_pH values.")
                
    return True
