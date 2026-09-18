import os
from pathlib import Path
import pandas as pd
import logging

logger = logging.getLogger(__name__)

def load_dataset(filepath: str = None) -> pd.DataFrame:
    """
    Loads raw CSV data from the specified path.
    Resolves relative paths relative to the project root using pathlib.Path.
    """
    ml_dir = Path(__file__).resolve().parent
    project_root = ml_dir.parent
    
    filename = Path(filepath).name if filepath else "irrigation_master_dataset_v1.csv"
    
    candidates = []
    if filepath:
        candidates.append(Path(filepath))
        candidates.append(project_root / filepath)
        candidates.append(Path.cwd() / filepath)
    
    candidates.extend([
        project_root / "datasets" / filename,
        project_root / "datasets" / "irrigation_master_dataset_v1.csv",
        Path.cwd() / "datasets" / filename,
        Path.cwd() / "datasets" / "irrigation_master_dataset_v1.csv",
        Path("/app/datasets") / filename,
        Path("/app/datasets/irrigation_master_dataset_v1.csv"),
    ])

    resolved_path = None
    for candidate in candidates:
        if candidate and candidate.exists() and candidate.is_file():
            resolved_path = candidate.resolve()
            break

    if not resolved_path:
        candidate_strs = [str(c) for c in candidates if c]
        logger.error(
            f"Dataset path not found: {filepath}. Project Root: {project_root}. Candidate paths checked: {candidate_strs}"
        )
        raise FileNotFoundError(f"Dataset path not found: {filepath} (Project Root: {project_root})")
    
    logger.info("Dataset path: %s", resolved_path)
    logger.info("Dataset exists: %s", resolved_path.exists())
    try:
        file_size_bytes = resolved_path.stat().st_size
        logger.info("Dataset file size: %d bytes", file_size_bytes)
    except Exception as e:
        logger.warning("Could not read dataset size: %s", e)

    logger.info(f"Loading raw dataset from resolved path: {resolved_path}...")
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

