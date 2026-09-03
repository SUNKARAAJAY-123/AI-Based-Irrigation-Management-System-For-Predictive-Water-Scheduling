"""
Farm Context Service for AgriSmart Voice Assistant.
Retrieves current farm, field, crop, sensor, telemetry, weather,
and recommendation data from the database.
"""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import database.models as models

logger = logging.getLogger("FarmContextService")

class FarmContextService:
    @staticmethod
    def get_farm_context(
        db: Session,
        user_id: Optional[str] = None,
        farm_id: Optional[str] = None,
        field_id: Optional[str] = None,
        crop_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves live data for the farmer's farm, field, crop, sensor, weather, and recommendation.
        Returns explicit 'available' status flags when data is missing.
        """
        farm_data: Dict[str, Any] = {
            "farm_found": False,
            "field_found": False,
            "crop_found": False,
            "farm_name": None,
            "field_name": None,
            "crop_name": None,
            "soil_type": None,
            "soil_moisture": None,
            "soil_moisture_status": None,
            "soil_moisture_available": False,
            "weather_available": False,
            "temperature": None,
            "humidity": None,
            "rain_probability": None,
            "weather_conditions": None,
            "recommendation_available": False,
            "is_irrigation_required": None,
            "recommended_water_volume_liters": 0.0,
            "risk_level": "low",
            "best_irrigation_time": None,
            "sensors_active": True,
            "sensor_count": 0,
            "active_alerts_count": 0
        }

        try:
            # 1. Resolve Farm
            farm = None
            if farm_id:
                farm = db.query(models.Farm).filter(models.Farm.id == farm_id).first()
            elif user_id:
                farm = db.query(models.Farm).filter(models.Farm.user_id == user_id).first()

            if not farm:
                return farm_data

            farm_data["farm_found"] = True
            farm_data["farm_name"] = farm.name
            farm_data["soil_type"] = farm.soil_type or "Loam"

            # 2. Resolve Field
            field = None
            if field_id:
                field = db.query(models.Field).filter(models.Field.id == field_id, models.Field.farm_id == farm.id).first()
            if not field:
                field = db.query(models.Field).filter(models.Field.farm_id == farm.id).first()

            if field:
                farm_data["field_found"] = True
                farm_data["field_name"] = field.name
                if field.soil_type:
                    farm_data["soil_type"] = field.soil_type

                # Check sensors
                sensors = db.query(models.Sensor).filter(models.Sensor.field_id == field.id).all()
                farm_data["sensor_count"] = len(sensors)
                inactive_sensors = [s for s in sensors if s.status == "inactive"]
                if inactive_sensors and len(inactive_sensors) == len(sensors):
                    farm_data["sensors_active"] = False

                # Active alerts
                active_alerts = db.query(models.AlertEvent).filter(
                    models.AlertEvent.field_id == field.id,
                    models.AlertEvent.status == "active"
                ).all()
                farm_data["active_alerts_count"] = len(active_alerts)

            # 3. Resolve Crop
            crop = None
            if crop_id:
                crop = db.query(models.Crop).filter(models.Crop.id == crop_id).first()
            elif field:
                crop = db.query(models.Crop).filter(models.Crop.field_id == field.id).first()
            elif farm:
                crop = db.query(models.Crop).join(models.Field).filter(models.Field.farm_id == farm.id).first()

            if crop:
                farm_data["crop_found"] = True
                farm_data["crop_name"] = crop.name

                # Latest Telemetry Log
                latest_telemetry = db.query(models.TelemetryLog).filter(
                    models.TelemetryLog.crop_id == crop.id
                ).order_by(models.TelemetryLog.timestamp.desc()).first()

                if latest_telemetry:
                    farm_data["soil_moisture_available"] = True
                    farm_data["soil_moisture"] = round(latest_telemetry.soil_moisture, 1)
                    if latest_telemetry.soil_moisture < 25.0:
                        farm_data["soil_moisture_status"] = "low"
                    elif latest_telemetry.soil_moisture > 65.0:
                        farm_data["soil_moisture_status"] = "high"
                    else:
                        farm_data["soil_moisture_status"] = "optimal"

                # Latest Irrigation Recommendation
                latest_rec = db.query(models.IrrigationRecommendation).filter(
                    models.IrrigationRecommendation.crop_id == crop.id
                ).order_by(models.IrrigationRecommendation.timestamp.desc()).first()

                if latest_rec:
                    farm_data["recommendation_available"] = True
                    farm_data["is_irrigation_required"] = latest_rec.is_irrigation_required
                    farm_data["recommended_water_volume_liters"] = latest_rec.recommended_water_volume_liters
                    farm_data["risk_level"] = latest_rec.risk_level
                    farm_data["best_irrigation_time"] = latest_rec.best_irrigation_time

            # 4. Resolve Weather Record
            weather_rec = db.query(models.WeatherRecord).filter(
                models.WeatherRecord.farm_id == farm.id
            ).order_by(models.WeatherRecord.timestamp.desc()).first()

            if weather_rec:
                farm_data["weather_available"] = True
                farm_data["temperature"] = weather_rec.temperature
                farm_data["humidity"] = weather_rec.humidity
                farm_data["rain_probability"] = weather_rec.precipitation_probability
                farm_data["weather_conditions"] = weather_rec.conditions or "Clear"

        except Exception as err:
            logger.error(f"Error gathering farm context: {err}")

        return farm_data
