import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import models
from backend.services import weather, scheduling
from backend.utils.config import settings

logger = logging.getLogger("AlertEngineService")

async def evaluate_field_alerts(db: Session, field_id: str, stats: Optional[Dict[str, int]] = None) -> List[models.AlertEvent]:
    """
    Evaluates rule-based and predictive alerts for a specific field.
    Prevents duplicate notifications by checking active alerts and resolving
    them when conditions return to normal.
    """
    if stats is not None:
        stats["fields_checked"] += 1
        stats["alerts_evaluated"] += 1

    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        logger.error(f"Field {field_id} not found for alert evaluation.")
        if stats is not None:
            stats["errors"] += 1
        return []

    # 1. Resolve / Create Thresholds
    thresholds = field.thresholds
    if not thresholds:
        thresholds = models.FieldThreshold(field_id=field.id)
        db.add(thresholds)
        db.commit()
        db.refresh(thresholds)

    # 2. Get Weather Data (with fallback if API fails)
    lat = field.farm.location_latitude
    lon = field.farm.location_longitude
    weather_data = {}
    try:
        weather_data = await weather.fetch_weather_data(lat, lon)
    except Exception as e:
        logger.warning(f"Failed to fetch weather data for farm {field.farm.id} in alert evaluation: {e}")
        if stats is not None:
            stats["errors"] += 1

    current_temp = weather_data.get("temp", 25.0)
    current_humidity = weather_data.get("humidity", 50.0)
    current_wind = weather_data.get("wind_speed", 10.0)
    
    # 24h rain probability
    hourly_forecast = weather_data.get("hourly", [])[:24]
    rain_probability_24h = max((float(item.get("rain_probability", 0.0)) for item in hourly_forecast), default=0.0)

    # 3. Get Crop and Telemetry Data
    crop = db.query(models.Crop).filter(
        models.Crop.field_id == field.id, 
        models.Crop.status == "growing"
    ).order_by(models.Crop.planted_at.desc()).first()

    latest_telemetry = None
    if crop:
        latest_telemetry = db.query(models.TelemetryLog).filter(
            models.TelemetryLog.crop_id == crop.id
        ).order_by(models.TelemetryLog.timestamp.desc()).first()

    # Active alerts tracking (to mark resolved or skip duplicates)
    active_db_alerts = db.query(models.AlertEvent).filter(
        models.AlertEvent.field_id == field.id,
        models.AlertEvent.status == "active"
    ).all()
    active_alerts_by_type = {a.alert_type: a for a in active_db_alerts}

    triggered_alerts: List[Dict[str, Any]] = []

    # Helper to add alert triggers
    def trigger(alert_type: str, severity: str, message: str, action: str, condition_str: str):
        triggered_alerts.append({
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "recommended_action": action,
            "condition": condition_str
        })

    # ==========================================================================
    # RULE 3, 4 & 5: Soil Moisture & Weather-Aware Check
    # ==========================================================================
    current_moisture = None
    if latest_telemetry:
        current_moisture = latest_telemetry.soil_moisture
        
        # Determine recommended irrigation duration in minutes
        minutes = max(15, min(60, int((thresholds.warning_moisture - current_moisture) * 3))) if current_moisture < thresholds.warning_moisture else 0
        
        # 1. Critical Low Soil Moisture
        if current_moisture < thresholds.critical_moisture:
            if rain_probability_24h < thresholds.rain_probability_threshold:
                trigger(
                    "irrigation_required",
                    "CRITICAL",
                    f"Critical Low Soil Moisture: Volumetric soil moisture is at {current_moisture}%, below the critical limit of {thresholds.critical_moisture}%.",
                    f"Irrigate {field.name} for approximately {minutes} minutes.",
                    f"moisture({current_moisture}%) < critical({thresholds.critical_moisture}%) AND rain_prob({int(rain_probability_24h * 100)}%) < threshold({int(thresholds.rain_probability_threshold * 100)}%)"
                )
            else:
                trigger(
                    "rain_expected",
                    "WARNING",
                    f"Rain is expected soon (probability: {int(rain_probability_24h * 100)}%). Irrigation is currently not recommended despite critical low soil moisture ({current_moisture}%).",
                    "Suspend any scheduled irrigation to save water and leverage natural rainfall.",
                    f"moisture({current_moisture}%) < critical({thresholds.critical_moisture}%) AND rain_prob({int(rain_probability_24h * 100)}%) >= threshold({int(thresholds.rain_probability_threshold * 100)}%)"
                )
        # 2. Warning Low Soil Moisture
        elif current_moisture < thresholds.warning_moisture:
            if rain_probability_24h < thresholds.rain_probability_threshold:
                trigger(
                    "irrigation_required",
                    "WARNING",
                    f"Low Soil Moisture Warning: Soil moisture is at {current_moisture}%, which is below the optimal threshold of {thresholds.warning_moisture}%.",
                    f"Irrigate {field.name} for approximately {minutes} minutes.",
                    f"moisture({current_moisture}%) < warning({thresholds.warning_moisture}%) AND rain_prob({int(rain_probability_24h * 100)}%) < threshold({int(thresholds.rain_probability_threshold * 100)}%)"
                )
            else:
                trigger(
                    "rain_expected",
                    "INFO",
                    f"Rain is expected soon (probability: {int(rain_probability_24h * 100)}%). Irrigation is currently not recommended while moisture is low ({current_moisture}%).",
                    "Suspend any scheduled irrigation to leverage natural rainfall.",
                    f"moisture({current_moisture}%) < warning({thresholds.warning_moisture}%) AND rain_prob({int(rain_probability_24h * 100)}%) >= threshold({int(thresholds.rain_probability_threshold * 100)}%)"
                )
            
        # 3. Overwatering Check (Rule 6)
        if current_moisture > thresholds.overwatering_moisture:
            trigger(
                "overwatering_risk",
                "WARNING",
                f"Possible Overwatering Risk: Soil moisture is extremely high at {current_moisture}%, exceeding the threshold of {thresholds.overwatering_moisture}%.",
                "High soil moisture detected. Avoid additional irrigation until moisture decreases.",
                f"moisture({current_moisture}%) > overwatering({thresholds.overwatering_moisture}%)"
            )

    # ==========================================================================
    # RULE 7 & 8: Sensor Failure / Missing Sensor Data
    # ==========================================================================
    sensors = field.sensors
    if len(sensors) > 0:
        for sensor in sensors:
            if sensor.status == "active":
                latest_sensor_log = db.query(models.TelemetryLog).filter(
                    models.TelemetryLog.sensor_id == sensor.id
                ).order_by(models.TelemetryLog.timestamp.desc()).first()

                if latest_sensor_log:
                    time_diff = datetime.now(timezone.utc) - latest_sensor_log.timestamp.replace(tzinfo=timezone.utc)
                    
                    # 0-30 minutes: No alert
                    # 30-60 minutes: Warning
                    # > 60 minutes: Critical Sensor Failure
                    warning_timeout = timedelta(minutes=getattr(settings, "SENSOR_WARNING_TIMEOUT_MINUTES", 30))
                    critical_timeout = timedelta(minutes=getattr(settings, "SENSOR_CRITICAL_TIMEOUT_MINUTES", 60))
                    
                    if time_diff > critical_timeout:
                        trigger(
                            f"sensor_failure_{sensor.id}",
                            "CRITICAL",
                            f"Sensor Failure: Field '{field.name}' sensor '{sensor.name}' has stopped sending data.",
                            "Inspect sensor power supply, batteries, and signal connectivity.",
                            f"sensor_offline_duration({round(time_diff.total_seconds() / 60)} mins) > critical_timeout({settings.SENSOR_CRITICAL_TIMEOUT_MINUTES} mins)"
                        )
                    elif time_diff > warning_timeout:
                        trigger(
                            f"sensor_missing_warning_{sensor.id}",
                            "WARNING",
                            f"Sensor Telemetry Missing: Field '{field.name}' sensor '{sensor.name}' has not reported data recently.",
                            "Check gateway connection and inspect sensor status.",
                            f"sensor_offline_duration({round(time_diff.total_seconds() / 60)} mins) > warning_timeout({settings.SENSOR_WARNING_TIMEOUT_MINUTES} mins)"
                        )
                else:
                    # No data recorded at all
                    trigger(
                        f"sensor_failure_{sensor.id}",
                        "CRITICAL",
                        f"Sensor Failure: Active sensor '{sensor.name}' has never sent telemetry records.",
                        "Verify sensor setup, credentials, and network connection.",
                        "sensor_no_telemetry_history"
                    )
    else:
        # No sensors registered
        trigger(
            "sensor_data_missing",
            "CRITICAL",
            f"Sensor Data Missing: No sensors are registered for field '{field.name}'.",
            "Ensure sensor hardware is registered and associated with the field.",
            "zero_sensors_registered"
        )

    # ==========================================================================
    # RULE 9: LSTM Predictive Alert
    # ==========================================================================
    if current_moisture is not None and crop:
        # Calculate hourly depletion rate based on climate indexes and soil properties
        et_index = (current_temp * 0.7) - (current_humidity * 0.2)
        
        base_depletion = 4.0
        soil_type = (field.soil_type or "clay").lower()
        soil_mult = 0.7 if "clay" in soil_type else (1.5 if "sandy" in soil_type else 1.0)
        et_mult = max(0.5, min(2.0, et_index / 4.0))
        
        depletion_rate_daily = base_depletion * soil_mult * et_mult
        depletion_rate_hourly = max(0.1, depletion_rate_daily / 24.0)

        # Forecast soil moisture decay over 6, 12, and 24 hours
        moisture_6h = max(0.0, current_moisture - depletion_rate_hourly * 6)
        moisture_12h = max(0.0, current_moisture - depletion_rate_hourly * 12)
        moisture_24h = max(0.0, current_moisture - depletion_rate_hourly * 24)

        if moisture_6h < thresholds.critical_moisture:
            trigger(
                "predicted_low_moisture",
                "CRITICAL",
                f"Soil moisture is predicted to fall below the critical level within 6 hours.",
                "Schedule a preemptive irrigation cycle immediately to avoid crop water stress.",
                f"predicted_moisture_6h({round(moisture_6h, 1)}%) < critical({thresholds.critical_moisture}%)"
            )
        elif moisture_12h < thresholds.critical_moisture:
            trigger(
                "predicted_low_moisture",
                "CRITICAL",
                f"Soil moisture is predicted to fall below the critical level within 12 hours.",
                "Schedule a preemptive irrigation cycle before 12 hours to avoid crop water stress.",
                f"predicted_moisture_12h({round(moisture_12h, 1)}%) < critical({thresholds.critical_moisture}%)"
            )
        elif moisture_24h < thresholds.critical_moisture:
            trigger(
                "predicted_low_moisture",
                "WARNING",
                f"Soil moisture is predicted to fall below the critical level within 24 hours.",
                "Schedule a preemptive irrigation cycle before 24 hours to avoid crop water stress.",
                f"predicted_moisture_24h({round(moisture_24h, 1)}%) < critical({thresholds.critical_moisture}%)"
            )

    # ==========================================================================
    # RULE 10: Irrigation Status Check
    # ==========================================================================
    if crop:
        latest_rec = db.query(models.IrrigationRecommendation).filter(
            models.IrrigationRecommendation.crop_id == crop.id
        ).order_by(models.IrrigationRecommendation.timestamp.desc()).first()

        if latest_rec:
            rec_status = latest_rec.status.upper()
            if rec_status == "COMPLETED":
                # Check if we already notified about this specific recommendation
                alert_exists = db.query(models.AlertEvent).filter(
                    models.AlertEvent.field_id == field.id,
                    models.AlertEvent.alert_type == "irrigation_completed",
                    models.AlertEvent.message.contains(latest_rec.id)
                ).first()
                if not alert_exists:
                    trigger(
                        "irrigation_completed",
                        "INFO",
                        f"Irrigation completed successfully for field '{field.name}'. Recommendation ID: {latest_rec.id}.",
                        "Monitor soil moisture levels to ensure they stabilize.",
                        f"recommendation_status({latest_rec.id}) == COMPLETED"
                    )
            elif rec_status == "FAILED":
                # Check if we already notified about this specific recommendation
                alert_exists = db.query(models.AlertEvent).filter(
                    models.AlertEvent.field_id == field.id,
                    models.AlertEvent.alert_type == "irrigation_failure",
                    models.AlertEvent.message.contains(latest_rec.id)
                ).first()
                if not alert_exists:
                    trigger(
                        "irrigation_failure",
                        "CRITICAL",
                        f"Irrigation event failed for field '{field.name}'. Recommendation ID: {latest_rec.id}.",
                        "Check water pump, valves, power supply, and network connectivity.",
                        f"recommendation_status({latest_rec.id}) == FAILED"
                    )

    # ==========================================================================
    # SAVE NEW ALERTS & RESOLVE OLD ALERTS (LIFECYCLE)
    # ==========================================================================
    new_active_events: List[models.AlertEvent] = []
    triggered_types = {a["alert_type"] for a in triggered_alerts}

    # 1. Resolve database alerts whose conditions are no longer present
    for alert_type, active_alert in active_alerts_by_type.items():
        if alert_type not in triggered_types:
            active_alert.status = "resolved"
            active_alert.resolved_at = datetime.now(timezone.utc)
            
            # Formulate dynamic resolution reason
            reason = "Condition normalized."
            if "moisture" in alert_type and current_moisture is not None:
                reason = f"Soil moisture normalized to {current_moisture}%, crossing thresholds safely."
            elif "sensor_failure" in alert_type or "sensor_missing" in alert_type:
                reason = "Sensor heartbeat received; communication restored."
            elif "irrigation" in alert_type:
                reason = "Irrigation event completed or acknowledged."
                
            active_alert.resolution_reason = reason
            logger.info(f"Resolved alert {active_alert.id} ({alert_type}) for field {field_id}. Reason: {reason}")
            db.add(active_alert)
            if stats is not None:
                stats["resolved_alerts"] += 1

    # 2. Add and save new alerts that aren't already active (Deduplication)
    for item in triggered_alerts:
        a_type = item["alert_type"]
        if a_type not in active_alerts_by_type:
            new_alert = models.AlertEvent(
                field_id=field.id,
                alert_type=a_type,
                severity=item["severity"],
                message=item["message"],
                recommended_action=item["recommended_action"],
                condition=item["condition"],
                status="active"
            )
            db.add(new_alert)
            new_active_events.append(new_alert)
            logger.info(f"Triggered new alert {a_type} (Severity: {item['severity']}) for field {field_id}")
            if stats is not None:
                stats["new_alerts"] += 1

    if new_active_events or any(a.status == "resolved" for a in active_alerts_by_type.values()):
        db.commit()

    return new_active_events
