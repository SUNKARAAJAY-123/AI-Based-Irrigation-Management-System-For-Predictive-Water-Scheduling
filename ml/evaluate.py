import numpy as np
import pandas as pd
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import os
import time
import logging

logger = logging.getLogger(__name__)

def evaluate_model(model, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """
    Evaluates a single model against a test dataset.
    Returns a dictionary of metrics including R2, MAE, MSE, RMSE, and prediction time in ms.
    """
    t_start = time.time()
    y_pred = model.predict(X_test)
    pred_time = (time.time() - t_start) / len(X_test) # time per prediction
    
    # Calculate metrics
    r2 = float(r2_score(y_test, y_pred))
    mae = float(mean_absolute_error(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(np.sqrt(mse))
    
    return {
        "r2": round(r2, 4),
        "mae": round(mae, 4),
        "mse": round(mse, 4),
        "rmse": round(rmse, 4),
        "prediction_time_ms": round(pred_time * 1000, 5) # in milliseconds
    }

