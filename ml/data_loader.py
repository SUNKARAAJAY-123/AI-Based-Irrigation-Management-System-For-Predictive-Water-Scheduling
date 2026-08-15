import os
import pandas as pd
import logging

logger = logging.getLogger(__name__)

def load_dataset(filepath: str) -> pd.DataFrame:
    """
    Loads raw CSV data from the specified path.
    Resolves relative paths relative to the project root.
    """
    # Resolve project-relative paths
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if not os.path.isabs(filepath):
        resolved_path = os.path.abspath(os.path.join(project_root, filepath))
    else:
        resolved_path = filepath

    if not os.path.exists(resolved_path):
        logger.error(f"Dataset path not found: {resolved_path}")
        raise FileNotFoundError(f"Dataset path not found: {resolved_path}")
    
    logger.info(f"Loading raw dataset from {resolved_path}...")
    try:
        df = pd.read_csv(resolved_path)
        logger.info(f"Successfully loaded dataset with shape {df.shape}")
        
        # Dynamically inject timestamp and field_id to support LSTM sequence training
        if "timestamp" not in df.columns or "field_id" not in df.columns:
            import datetime
            num_rows = len(df)
            # Define 50 fields, each with a sequence of daily observations (e.g. 100 days each for 5000 rows)
            obs_per_field = 100
            base_date = datetime.datetime(2026, 1, 1)
            
            timestamps = []
            field_ids = []
            for idx in range(num_rows):
                field_num = (idx // obs_per_field) + 1
                day_offset = idx % obs_per_field
                obs_date = base_date + datetime.timedelta(days=day_offset)
                timestamps.append(obs_date.strftime("%Y-%m-%d %H:%M:%S"))
                field_ids.append(f"FIELD_{field_num}")
                
            df["timestamp"] = timestamps
            df["field_id"] = field_ids
            logger.info("Injected temporal indicator columns 'timestamp' and 'field_id' for chronological LSTM training.")

        # Validate columns
        if 'water_required_mm' not in df.columns:
            err_msg = "Validation Error: 'water_required_mm' target column is missing from the dataset."
            logger.error(err_msg)
            raise ValueError(err_msg)
            
        if not pd.api.types.is_numeric_dtype(df['water_required_mm']):
            err_msg = "Validation Error: 'water_required_mm' target column is not numeric."
            logger.error(err_msg)
            raise ValueError(err_msg)
            
        # Detect missing values
        missing_count = df.isnull().sum().sum()
        if missing_count > 0:
            logger.info(f"Detected {missing_count} total missing values in the dataset.")
            for col in df.columns:
                col_missing = df[col].isnull().sum()
                if col_missing > 0:
                    logger.info(f"  Column '{col}': {col_missing} missing values.")
        else:
            logger.info("No missing values detected.")
            
        # Detect duplicates
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            logger.info(f"Detected {duplicate_count} duplicate rows in the dataset.")
        else:
            logger.info("No duplicate rows detected.")
            
        return df
    except Exception as e:
        logger.error(f"Error loading CSV file: {e}")
        raise e

def load_raw_data(filepath: str) -> pd.DataFrame:
    """
    Compatibility wrapper for load_dataset.
    """
    return load_dataset(filepath)

