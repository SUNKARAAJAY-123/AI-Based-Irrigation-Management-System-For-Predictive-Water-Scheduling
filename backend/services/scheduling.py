import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.services import weather
from backend.utils.config import settings
from database import models

logger = logging.getLogger("IrrigationSchedulingService")

async def generate_irrigation_schedule(
    water_required_mm: float,
    soil_moisture: float,
    crop_type: str,
    crop_growth_stage: Optional[str] = None,
    ET_index: Optional[float] = None,
    previous_irrigation_mm: Optional[float] = None,
    temperature_c: Optional[float] = None,
    humidity: Optional[float] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    field_id: Optional[str] = None,
    soil_type: Optional[str] = "clay",
    db: Optional[Session] = None,
) -> dict:
    """
    Determines recommended irrigation date/time, days until irrigation, and a scheduling status.
    Calculates soil moisture depletion based on crop, soil, and ET index, and adjusts for forecast rainfall.
    """
    # 1. Resolve coordinates
    lat = latitude
    lon = longitude
    if lat is None or lon is None:
        if field_id and db:
            try:
                # Resolve field ID string or object
                field = db.query(models.Field).filter(models.Field.id == field_id).first()
                if field and field.farm:
                    lat = field.farm.location_latitude
                    lon = field.farm.location_longitude
            except Exception as db_err:
                logger.warning(f"Could not load farm location from database: {db_err}")
                
        # Default to a standard location in Andhra Pradesh if none resolved
        if lat is None or lon is None:
            lat = 15.9129
            lon = 79.7400

    # 2. Fetch weather data
    weather_data = None
    weather_status = "unavailable"
    try:
        weather_data = await weather.fetch_weather_data(lat, lon)
        if weather_data:
            weather_status = "available"
    except Exception as w_err:
        logger.warning(f"Weather forecast service error: {w_err}")
        weather_status = "unavailable"

    # 3. Determine crop threshold
    c_name = (crop_type or "").strip().lower()
    if "rice" in c_name:
        target_threshold = 50.0
    elif "tomato" in c_name:
        target_threshold = 40.0
    elif "wheat" in c_name:
        target_threshold = 35.0
    elif "maize" in c_name:
        target_threshold = 35.0
    elif "cotton" in c_name:
        target_threshold = 30.0
    else:
        target_threshold = 35.0

    # 4. Calculate ET Index if not provided
    if ET_index is None:
        if temperature_c is not None and humidity is not None:
            ET_index = (temperature_c * 0.7) - (humidity * 0.2)
        else:
            ET_index = 3.5  # Standard default

    # 5. Base daily depletion rate calculation
    base_depletion = 4.0  # base soil moisture percentage points dropped per day
    
    # Soil type multiplier
    s_type = (soil_type or "").strip().lower()
    if "clay" in s_type:
        soil_mult = 0.7
    elif "loam" in s_type:
        soil_mult = 1.0
    elif "sandy" in s_type:
        soil_mult = 1.5
    elif "silt" in s_type:
        soil_mult = 1.1
    else:
        soil_mult = 1.0
        
    # Crop growth stage multiplier
    stage = (crop_growth_stage or "").strip().lower()
    if "sowing" in stage:
        stage_mult = 0.8
    elif "vegetative" in stage:
        stage_mult = 1.0
    elif "flowering" in stage or "reproductive" in stage:
        stage_mult = 1.3
    elif "harvest" in stage:
        stage_mult = 0.5
    else:
        stage_mult = 1.0

    # ET factor
    et_mult = max(0.5, min(2.0, ET_index / 4.0))
    
    # Depletion rate per day
    depletion_rate = base_depletion * soil_mult * stage_mult * et_mult
    depletion_rate = max(0.5, depletion_rate)  # Prevent division by zero or extremely low rates

    # 6. Estimate days until irrigation
    if soil_moisture <= target_threshold:
        days_until_irrigation = 0
    else:
        days_until_irrigation = max(0, round((soil_moisture - target_threshold) / depletion_rate))
        
    # Bound to reasonable schedule window
    days_until_irrigation = min(7, days_until_irrigation)

    # 7. Check Weather Forecast for rain adjustments
    weather_warning = None
    rain_index = None
    rain_probability = 0.0
    
    if weather_data:
        daily_forecast = weather_data.get("daily", [])
        for idx, day_forecast in enumerate(daily_forecast[:7]):
            prob = day_forecast.get("rain_probability", 0.0)
            if prob >= 0.5:
                # Found a day with significant rain
                rain_index = idx
                rain_probability = prob
                break
                
    # If rain is expected before or on the day of planned irrigation
    if rain_index is not None and rain_index <= days_until_irrigation:
        weather_warning = "Rain is expected before the recommended irrigation time."
        # Postpone irrigation to the day after rain
        days_until_irrigation = min(7, rain_index + 1)
        
    # 8. Timezone-aware date and time calculation (Asia/Kolkata)
    kolkata_tz = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")
    now_tz = datetime.now(kolkata_tz)
    recommended_date_dt = now_tz + timedelta(days=days_until_irrigation)
    recommended_date = recommended_date_dt.strftime("%Y-%m-%d")
    
    # Determine preferred window timing
    pref_window = getattr(settings, "PREFERRED_IRRIGATION_WINDOW", "05:00-09:00").lower()
    if "evening" in pref_window or "16:00" in pref_window or "17:00" in pref_window or "18:00" in pref_window:
        recommended_time = "18:00"
        display_time = "6:00 PM"
        hour_val = 18
    else:
        recommended_time = "06:00"
        display_time = "6:00 AM"
        hour_val = 6
        
    # Full recommended datetime representation
    recommended_datetime = recommended_date_dt.replace(hour=hour_val, minute=0, second=0, microsecond=0)

    # 9. Dynamic reason explanation
    factors = []
    if soil_moisture <= target_threshold:
        factors.append(f"soil moisture of {soil_moisture}% is below crop threshold ({target_threshold}%)")
    else:
        factors.append(f"soil moisture is depleting (currently {soil_moisture}%)")
        
    if crop_growth_stage:
        factors.append(f"crop stage is {crop_growth_stage}")
        
    if ET_index:
        factors.append(f"ET index is {ET_index:.1f}")
        
    if weather_warning:
        factors.append(f"rain forecast is evaluated (postponing for expected rain)")
    else:
        factors.append("rainfall forecast is low")

    reason = "Recommended based on " + ", ".join(factors) + "."

    return {
        "status": "delayed" if weather_warning else ("recommended" if water_required_mm > 0 else "no_irrigation"),
        "days_until_irrigation": days_until_irrigation,
        "recommended_date": recommended_date,
        "recommended_time": recommended_time,
        "display_time": display_time,
        "timezone": "Asia/Kolkata",
        "reason": reason,
        "weather_warning": weather_warning,
        "weather_data_status": weather_status,
        "recommended_datetime_iso": recommended_datetime.isoformat()
    }
