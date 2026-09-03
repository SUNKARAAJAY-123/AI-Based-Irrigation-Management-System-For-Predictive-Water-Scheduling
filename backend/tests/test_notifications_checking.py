import os
import sys
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from sqlalchemy.orm import Session

# Add project root to python path to resolve modules correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from database.database import SessionLocal
from database import models
from backend.services import alerts, notifications
from backend.utils.config import settings

def run_async(coro):
    """Helper to run async functions synchronously in pytest."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@pytest.fixture(scope="function")
def db():
    # Run migrations to ensure columns exist in test database
    try:
        from database.database import migrate_db_columns
        migrate_db_columns()
    except Exception as e:
        print(f"Error migrating DB: {e}")

    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.rollback()
        db_session.close()

@pytest.fixture(scope="function")
def test_setup(db: Session):
    # Clean database tables to ensure clean test state
    db.query(models.NotificationLog).delete()
    db.query(models.NotificationDeliveryLog).delete()
    db.query(models.NotificationPreference).delete()
    db.query(models.PushSubscription).delete()
    db.query(models.AlertEvent).delete()
    db.query(models.TelemetryLog).delete()
    db.query(models.Sensor).delete()
    db.query(models.Crop).delete()
    db.query(models.FieldThreshold).delete()
    db.query(models.Field).delete()
    db.query(models.Farm).delete()
    db.query(models.User).filter(models.User.email.in_(["farmer_test1@smart.com", "farmer_test2@smart.com"])).delete()
    db.commit()

    # Create two test farmers
    farmer1 = models.User(
        email="farmer_test1@smart.com",
        hashed_password="test_password",
        full_name="Farmer Test One",
        preferred_language="en-IN",
        role="FARMER",
        status="ACTIVE"
    )
    farmer2 = models.User(
        email="farmer_test2@smart.com",
        hashed_password="test_password",
        full_name="Farmer Test Two",
        preferred_language="te-IN",
        role="FARMER",
        status="ACTIVE"
    )
    db.add(farmer1)
    db.add(farmer2)
    db.commit()
    db.refresh(farmer1)
    db.refresh(farmer2)

    # Initialize preferences
    notifications.init_user_preferences(db, farmer1.id)
    notifications.init_user_preferences(db, farmer2.id)

    # Create farms and fields
    farm1 = models.Farm(user_id=farmer1.id, name="Farm One", location_latitude=15.91, location_longitude=79.74, area_hectares=2.0)
    farm2 = models.Farm(user_id=farmer2.id, name="Farm Two", location_latitude=16.10, location_longitude=80.12, area_hectares=1.5)
    db.add(farm1)
    db.add(farm2)
    db.commit()
    db.refresh(farm1)
    db.refresh(farm2)

    field1 = models.Field(farm_id=farm1.id, name="Field 01", area_hectares=1.0)
    field2 = models.Field(farm_id=farm2.id, name="Field 02", area_hectares=0.8)
    db.add(field1)
    db.add(field2)
    db.commit()
    db.refresh(field1)
    db.refresh(field2)

    # Create active crops
    crop1 = models.Crop(field_id=field1.id, name="Tomato", planted_at=datetime.now(timezone.utc) - timedelta(days=30), status="growing")
    crop2 = models.Crop(field_id=field2.id, name="Rice", planted_at=datetime.now(timezone.utc) - timedelta(days=20), status="growing")
    db.add(crop1)
    db.add(crop2)
    db.commit()
    db.refresh(crop1)
    db.refresh(crop2)

    # Setup field thresholds
    thresholds1 = models.FieldThreshold(
        field_id=field1.id,
        critical_moisture=25.0,
        warning_moisture=35.0,
        overwatering_moisture=70.0,
        rain_probability_threshold=0.60
    )
    thresholds2 = models.FieldThreshold(
        field_id=field2.id,
        critical_moisture=30.0,
        warning_moisture=45.0,
        overwatering_moisture=75.0,
        rain_probability_threshold=0.55
    )
    db.add(thresholds1)
    db.add(thresholds2)
    db.commit()

    # Create active sensors
    sensor1 = models.Sensor(field_id=field1.id, name="Soil Sensor F1", sensor_type="soil_moisture", status="active")
    sensor2 = models.Sensor(field_id=field2.id, name="Soil Sensor F2", sensor_type="soil_moisture", status="active")
    db.add(sensor1)
    db.add(sensor2)
    db.commit()
    db.refresh(sensor1)
    db.refresh(sensor2)

    return {
        "farmer1": farmer1,
        "farmer2": farmer2,
        "field1": field1,
        "field2": field2,
        "crop1": crop1,
        "crop2": crop2,
        "sensor1": sensor1,
        "sensor2": sensor2
    }


def test_normal_moisture_no_alert(db: Session, test_setup):
    """TEST 1: Moisture normal -> No alert"""
    setup = test_setup
    
    # Add a normal soil moisture reading
    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=45.0, # Normal moisture (warning is 35.0)
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 28.0,
            "humidity": 45,
            "wind_speed": 12.0,
            "conditions": "Sunny",
            "hourly": [{"rain_probability": 0.1}] * 24
        }
        
        # Evaluate alerts
        run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        # Check active alerts in DB for field 1
        active_alerts = db.query(models.AlertEvent).filter(
            models.AlertEvent.field_id == setup["field1"].id,
            models.AlertEvent.status == "active",
            models.AlertEvent.alert_type == "irrigation_required"
        ).all()
        
        assert len(active_alerts) == 0


def test_low_moisture_no_rain_irrigation_alert(db: Session, test_setup):
    """TEST 2: Moisture low + no rain -> Irrigation alert"""
    setup = test_setup
    
    # Add critical low soil moisture reading
    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=18.0, # Below critical 25.0
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 28.0,
            "humidity": 45,
            "wind_speed": 12.0,
            "conditions": "Sunny",
            "hourly": [{"rain_probability": 0.15}] * 24
        }
        
        new_alerts = run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        assert len(new_alerts) > 0
        irr_alert = next((a for a in new_alerts if a.alert_type == "irrigation_required"), None)
        assert irr_alert is not None
        assert irr_alert.severity == "CRITICAL"
        assert "Irrigate" in irr_alert.recommended_action


def test_low_moisture_heavy_rain_postponed(db: Session, test_setup):
    """TEST 3: Moisture low + heavy rain -> Irrigation postponed"""
    setup = test_setup
    
    # Clean previous alerts
    db.query(models.AlertEvent).filter(models.AlertEvent.field_id == setup["field1"].id).delete()
    db.commit()

    # Moisture low (18.0)
    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=18.0,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 24.0,
            "humidity": 80,
            "wind_speed": 15.0,
            "conditions": "Heavy Rain",
            "hourly": [{"rain_probability": 0.90}] * 24
        }
        
        new_alerts = run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        # Verify RAIN_EXPECTED alert created and NO irrigation_required
        rain_alert = next((a for a in new_alerts if a.alert_type == "rain_expected"), None)
        assert rain_alert is not None
        assert rain_alert.severity == "WARNING"
        
        irr_alert = next((a for a in new_alerts if a.alert_type == "irrigation_required"), None)
        assert irr_alert is None


def test_high_moisture_overwatering_warning(db: Session, test_setup):
    """TEST 4: Moisture high -> Overwatering warning"""
    setup = test_setup
    
    db.query(models.AlertEvent).filter(models.AlertEvent.field_id == setup["field1"].id).delete()
    db.commit()

    # Moisture high (75.0, overwatering is 70.0)
    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=75.0,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 26.0,
            "humidity": 60,
            "wind_speed": 8.0,
            "conditions": "Cloudy",
            "hourly": [{"rain_probability": 0.1}] * 24
        }
        
        new_alerts = run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        overwater_alert = next((a for a in new_alerts if a.alert_type == "overwatering_risk"), None)
        assert overwater_alert is not None
        assert overwater_alert.severity == "WARNING"
        assert "Overwatering" in overwater_alert.message


def test_sensor_offline_failure(db: Session, test_setup):
    """TEST 5: Sensor stops sending data -> Sensor failure"""
    setup = test_setup
    
    # Delete old alerts
    db.query(models.AlertEvent).filter(models.AlertEvent.field_id == setup["field1"].id).delete()
    db.commit()

    # Add telemetry log with timestamp 25 hours ago
    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=35.0,
        timestamp=datetime.now(timezone.utc) - timedelta(hours=25)
    )
    db.add(log)
    db.commit()

    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 25.0,
            "humidity": 50,
            "wind_speed": 10.0,
            "conditions": "Clear",
            "hourly": [{"rain_probability": 0.1}] * 24
        }
        
        new_alerts = run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        sensor_fail_alert = next((a for a in new_alerts if a.alert_type == f"sensor_failure_{setup['sensor1'].id}"), None)
        assert sensor_fail_alert is not None
        assert sensor_fail_alert.severity == "CRITICAL"


def test_lstm_predicted_low_moisture(db: Session, test_setup):
    """TEST 6: LSTM predicts critical moisture -> Predictive alert"""
    setup = test_setup
    
    db.query(models.AlertEvent).filter(models.AlertEvent.field_id == setup["field1"].id).delete()
    db.commit()

    # Current moisture is warning level (28.0) but high depletion rate will drop it below critical (25.0) within 12 hours
    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=28.0,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    # Mock high temperature and low humidity to accelerate calculated depletion
    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 42.0, # High temperature makes ET index high
            "humidity": 20, # Low humidity increases depletion rate
            "wind_speed": 15.0,
            "conditions": "Clear",
            "hourly": [{"rain_probability": 0.1}] * 24
        }
        
        new_alerts = run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        predicted_alert = next((a for a in new_alerts if a.alert_type == "predicted_low_moisture"), None)
        assert predicted_alert is not None
        assert "predicted to fall" in predicted_alert.message


def test_repeated_check_no_duplicate_alerts(db: Session, test_setup):
    """TEST 7: Same condition checked repeatedly -> No duplicate notifications"""
    setup = test_setup
    
    db.query(models.AlertEvent).filter(models.AlertEvent.field_id == setup["field1"].id).delete()
    db.commit()

    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=15.0, # Low moisture
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 28.0,
            "humidity": 45,
            "wind_speed": 10.0,
            "conditions": "Clear",
            "hourly": [{"rain_probability": 0.1}] * 24
        }
        
        # First check: triggers alert
        first_checks = run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        assert len(first_checks) > 0
        
        first_active_count = db.query(models.AlertEvent).filter(
            models.AlertEvent.field_id == setup["field1"].id,
            models.AlertEvent.status == "active"
        ).count()
        
        # Second check: should not return new alerts because they are already active
        second_checks = run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        assert len(second_checks) == 0

        # Query all active alerts: count should remain the same
        second_active_count = db.query(models.AlertEvent).filter(
            models.AlertEvent.field_id == setup["field1"].id,
            models.AlertEvent.status == "active"
        ).count()
        assert second_active_count == first_active_count


def test_condition_resolves_automatically(db: Session, test_setup):
    """TEST 8: Condition resolves -> Alert becomes RESOLVED"""
    setup = test_setup
    
    # Seed low moisture first to ensure active alert exists
    db.query(models.AlertEvent).filter(models.AlertEvent.field_id == setup["field1"].id).delete()
    db.commit()

    log = models.TelemetryLog(
        crop_id=setup["crop1"].id,
        sensor_id=setup["sensor1"].id,
        soil_moisture=18.0,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    with patch("backend.services.weather.fetch_weather_data", new_callable=AsyncMock) as mock_weather:
        mock_weather.return_value = {
            "temp": 28.0,
            "humidity": 45,
            "wind_speed": 10.0,
            "conditions": "Clear",
            "hourly": [{"rain_probability": 0.1}] * 24
        }
        
        run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        active_alert = db.query(models.AlertEvent).filter(
            models.AlertEvent.field_id == setup["field1"].id,
            models.AlertEvent.status == "active",
            models.AlertEvent.alert_type == "irrigation_required"
        ).first()
        assert active_alert is not None
        
        # Now seed normal moisture (45.0)
        log2 = models.TelemetryLog(
            crop_id=setup["crop1"].id,
            sensor_id=setup["sensor1"].id,
            soil_moisture=45.0,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(log2)
        db.commit()
        
        # Evaluate again: should resolve previous alert
        run_async(alerts.evaluate_field_alerts(db, setup["field1"].id))
        
        resolved_alert = db.query(models.AlertEvent).filter(
            models.AlertEvent.id == active_alert.id
        ).first()
        
        assert resolved_alert.status == "resolved"
        assert resolved_alert.resolved_at is not None
        assert resolved_alert.resolution_reason is not None


def test_critical_alert_push_and_sms(db: Session, test_setup):
    """TEST 9: Critical alert -> Push + SMS if configured"""
    setup = test_setup
    
    # Configure user 1 phone number
    setup["farmer1"].phone_number = "+919876543210"
    db.add(setup["farmer1"])
    db.commit()

    # Create dummy critical alert
    alert = models.AlertEvent(
        field_id=setup["field1"].id,
        alert_type="irrigation_required",
        severity="CRITICAL",
        message="Critical drought warning",
        recommended_action="Irrigate immediately",
        status="active"
    )
    db.add(alert)
    db.commit()

    with patch("backend.services.notifications.send_sms", new_callable=AsyncMock) as mock_sms, \
         patch("backend.services.notifications.send_web_push", new_callable=AsyncMock) as mock_push:
        
        mock_sms.return_value = True
        mock_push.return_value = True
        
        run_async(notifications.dispatch_alert_notifications(db, alert))
        
        # Verify both SMS and Web Push were dispatched
        mock_sms.assert_called_once()
        mock_push.assert_called_once()


def test_normal_alert_no_sms(db: Session, test_setup):
    """TEST 10: Normal information alert -> Push/in-app"""
    setup = test_setup
    
    # Create information alert
    alert = models.AlertEvent(
        field_id=setup["field1"].id,
        alert_type="irrigation_completed",
        severity="INFO",
        message="Irrigation completed",
        recommended_action="None",
        status="active"
    )
    db.add(alert)
    db.commit()

    with patch("backend.services.notifications.send_sms", new_callable=AsyncMock) as mock_sms, \
         patch("backend.services.notifications.send_web_push", new_callable=AsyncMock) as mock_push:
        
        mock_sms.return_value = True
        mock_push.return_value = True
        
        run_async(notifications.dispatch_alert_notifications(db, alert))
        
        # Verify Web Push was called, but SMS was NOT (since it is INFO, not CRITICAL)
        mock_push.assert_called_once()
        mock_sms.assert_not_called()


def test_farmer_language_telugu(db: Session, test_setup):
    """TEST 11: Farmer language = Telugu -> Notification generated in Telugu"""
    setup = test_setup
    
    # Create critical alert for Field 2 (Farmer 2 preferred language = Telugu)
    alert = models.AlertEvent(
        field_id=setup["field2"].id,
        alert_type="irrigation_required",
        severity="CRITICAL",
        message="Irrigation is required.",
        recommended_action="Risk level is high. Please irrigate immediately.",
        status="active"
    )
    db.add(alert)
    db.commit()

    with patch("backend.services.notifications.send_sms", new_callable=AsyncMock) as mock_sms, \
         patch("backend.services.notifications.send_web_push", new_callable=AsyncMock) as mock_push:
        
        mock_sms.return_value = True
        mock_push.return_value = True
        
        run_async(notifications.dispatch_alert_notifications(db, alert))
        
        # Verify the created notification log language is te-IN
        notif_log = db.query(models.NotificationLog).filter(
            models.NotificationLog.alert_id == alert.id,
            models.NotificationLog.farmer_id == setup["farmer2"].id
        ).first()
        
        assert notif_log is not None
        assert notif_log.language == "te-IN"
        assert "నೀರಾವರಿ" in notif_log.message or "తదుపరి" in notif_log.message or "ఆపరేషన్" in notif_log.message or "వార్నింగ్" in notif_log.message or "మట్టి" in notif_log.message or "స్థాయి" in notif_log.message or "సిఫార్సు" in notif_log.message or "Field:" in notif_log.message or "అపాయం" in notif_log.message


def test_farmer_language_hindi(db: Session, test_setup):
    """TEST 12: Farmer language = Hindi -> Notification generated in Hindi"""
    setup = test_setup
    
    # Update Farmer 1 preference to Hindi
    setup["farmer1"].preferred_language = "hi-IN"
    db.add(setup["farmer1"])
    db.commit()

    alert = models.AlertEvent(
        field_id=setup["field1"].id,
        alert_type="irrigation_required",
        severity="CRITICAL",
        message="Irrigation is required.",
        recommended_action="Risk level is high. Please irrigate immediately.",
        status="active"
    )
    db.add(alert)
    db.commit()

    with patch("backend.services.notifications.send_sms", new_callable=AsyncMock) as mock_sms, \
         patch("backend.services.notifications.send_web_push", new_callable=AsyncMock) as mock_push:
        
        mock_sms.return_value = True
        mock_push.return_value = True
        
        run_async(notifications.dispatch_alert_notifications(db, alert))
        
        # Verify notification log language is hi-IN
        notif_log = db.query(models.NotificationLog).filter(
            models.NotificationLog.alert_id == alert.id,
            models.NotificationLog.farmer_id == setup["farmer1"].id
        ).first()
        
        assert notif_log is not None
        assert notif_log.language == "hi-IN"
        # Offline Hindi translation check
        assert "सिंचाई" in notif_log.message or "जोखिम" in notif_log.message or "आवश्यकता" in notif_log.message


def test_push_delivery_fails(db: Session, test_setup):
    """TEST 13: Push delivery fails -> Delivery status = FAILED"""
    setup = test_setup
    
    # Create active subscription for farmer 1
    sub = models.PushSubscription(
        user_id=setup["farmer1"].id,
        endpoint="https://fcm.googleapis.com/fcm/send/invalid",
        p256dh="invalid_p256dh",
        auth="invalid_auth"
    )
    db.add(sub)
    db.commit()

    alert = models.AlertEvent(
        field_id=setup["field1"].id,
        alert_type="sensor_failure",
        severity="CRITICAL",
        message="Sensor stops sending data",
        recommended_action="Inspect sensor",
        status="active"
    )
    db.add(alert)
    db.commit()

    # Mock web push to return False (failed)
    with patch("backend.services.notifications.send_web_push", new_callable=AsyncMock) as mock_push:
        mock_push.return_value = False
        
        run_async(notifications.dispatch_alert_notifications(db, alert))
        
        # Check delivery logs
        delivery_log = db.query(models.NotificationDeliveryLog).filter(
            models.NotificationDeliveryLog.alert_event_id == alert.id,
            models.NotificationDeliveryLog.channel == "web_push"
        ).first()
        
        assert delivery_log is not None
        assert delivery_log.status == "failed"


def test_alert_isolation_between_farmers(db: Session, test_setup):
    """TEST 14: One farmer has an alert -> Other farmers do not receive it"""
    setup = test_setup
    
    # Add unique alert for Farmer 1
    alert = models.AlertEvent(
        field_id=setup["field1"].id,
        alert_type="overwatering_risk",
        severity="WARNING",
        message="Farmer 1 field overwatered",
        recommended_action="Turn off valves",
        status="active"
    )
    db.add(alert)
    db.commit()

    run_async(notifications.dispatch_alert_notifications(db, alert))
    
    # Farmer 1 should have in-app notification logs
    f1_logs = db.query(models.NotificationLog).filter(
        models.NotificationLog.farmer_id == setup["farmer1"].id,
        models.NotificationLog.alert_id == alert.id
    ).all()
    assert len(f1_logs) > 0
    
    # Farmer 2 should NOT have any notification log matching this alert
    f2_logs = db.query(models.NotificationLog).filter(
        models.NotificationLog.farmer_id == setup["farmer2"].id,
        models.NotificationLog.alert_id == alert.id
    ).all()
    assert len(f2_logs) == 0
