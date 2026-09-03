import os
import sys
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Add project root to python path to resolve modules correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app
from database.database import SessionLocal
from database import models
from backend.services import notifications

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()

@pytest.fixture(scope="module")
def setup_users(db: Session):
    # Clean up from previous runs
    db.query(models.NotificationLog).delete()
    db.query(models.NotificationPreference).delete()
    db.query(models.PushSubscription).delete()
    db.query(models.AlertEvent).delete()
    db.query(models.Field).delete()
    db.query(models.Farm).delete()
    db.query(models.User).filter(models.User.email.in_(["farmer1@test.com", "farmer2@test.com"])).delete()
    db.commit()

    # Create two test farmers
    # We create them directly in the DB to have exact control
    farmer1 = models.User(
        email="farmer1@test.com",
        hashed_password="hashed_password",
        full_name="Farmer One",
        preferred_language="en-IN",
        role="FARMER",
        status="ACTIVE"
    )
    farmer2 = models.User(
        email="farmer2@test.com",
        hashed_password="hashed_password",
        full_name="Farmer Two",
        preferred_language="te-IN", # Telugu for testing dynamic translation
        role="FARMER",
        status="ACTIVE"
    )
    db.add(farmer1)
    db.add(farmer2)
    db.commit()
    db.refresh(farmer1)
    db.refresh(farmer2)

    # Create farms and fields
    farm1 = models.Farm(user_id=farmer1.id, name="Farm One", location_latitude=12.97, location_longitude=77.59, area_hectares=2.5)
    farm2 = models.Farm(user_id=farmer2.id, name="Farm Two", location_latitude=13.08, location_longitude=80.27, area_hectares=1.8)
    db.add(farm1)
    db.add(farm2)
    db.commit()
    db.refresh(farm1)
    db.refresh(farm2)

    field1 = models.Field(farm_id=farm1.id, name="Field 01", area_hectares=1.2)
    field2 = models.Field(farm_id=farm2.id, name="Field 02", area_hectares=0.9)
    db.add(field1)
    db.add(field2)
    db.commit()
    db.refresh(field1)
    db.refresh(field2)

    # Generate JWT tokens for authentication
    from backend.auth import jwt
    token1 = jwt.create_access_token({"sub": farmer1.id, "email": farmer1.email, "role": farmer1.role, "status": farmer1.status})
    token2 = jwt.create_access_token({"sub": farmer2.id, "email": farmer2.email, "role": farmer2.role, "status": farmer2.status})

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    return {
        "farmer1": farmer1,
        "farmer2": farmer2,
        "field1": field1,
        "field2": field2,
        "headers1": headers1,
        "headers2": headers2
    }

def test_01_initial_zero_notifications(setup_users):
    # Farmer One checks notifications: should be 0
    resp = client.get("/farmer/notifications", headers=setup_users["headers1"])
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    # Check unread count
    resp = client.get("/farmer/notifications/unread-count", headers=setup_users["headers1"])
    assert resp.status_code == 200
    assert resp.json()["unread_count"] == 0

@pytest.mark.anyio
async def test_02_receive_and_read_notifications(db: Session, setup_users):
    headers1 = setup_users["headers1"]
    field1 = setup_users["field1"]
    
    # Clean database logs first
    db.query(models.NotificationLog).delete()
    db.query(models.AlertEvent).delete()
    db.commit()
    db.expire_all()

    # 1. Trigger alert event
    alert = models.AlertEvent(
        field_id=field1.id,
        alert_type="low_moisture_critical",
        severity="CRITICAL",
        message="Soil moisture is critically low at 18%.",
        recommended_action="Irrigate for 20 minutes.",
        status="active"
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # 2. Dispatch notifications
    await notifications.dispatch_alert_notifications(db, alert)
    db.commit()
    db.expire_all()

    # 3. Check notifications received
    resp = client.get("/farmer/notifications", headers=headers1)
    assert resp.status_code == 200
    notifs = resp.json()
    print("test_02 debug - notifs returned:", str(notifs).encode('ascii', 'ignore').decode('ascii'))
    assert len(notifs) == 1
    n = notifs[0]
    assert n["severity"] == "Critical"
    assert n["field"] == "Field 01"
    assert "Soil moisture is critically low at 18%." in n["message"]
    assert n["recommended_action"] == "Irrigate for 20 minutes."
    assert n["is_read"] is False

    # Check unread count
    resp = client.get("/farmer/notifications/unread-count", headers=headers1)
    assert resp.json()["unread_count"] == 1

    # 4. Mark notification as read
    notif_id = n["id"]
    resp = client.patch(f"/farmer/notifications/{notif_id}/read", headers=headers1)
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    # Verify unread count is 0
    resp = client.get("/farmer/notifications/unread-count", headers=headers1)
    assert resp.json()["unread_count"] == 0

def test_03_ownership_security(setup_users):
    headers1 = setup_users["headers1"]
    headers2 = setup_users["headers2"]
    
    # Use a new session to insert a notification log for farmer1 to be independent
    db_sess = SessionLocal()
    try:
        # Clean up existing notification logs first to be independent
        db_sess.query(models.NotificationLog).delete()
        db_sess.commit()
        
        # Create a notification log for farmer1
        notif = models.NotificationLog(
            farm_id=setup_users["field1"].farm_id,
            farmer_id=setup_users["farmer1"].id,
            field_id=setup_users["field1"].id,
            title="Security Test Title",
            message="Security Test Message",
            category="alert",
            is_read=False
        )
        db_sess.add(notif)
        db_sess.commit()
        db_sess.refresh(notif)
        notif_id = notif.id
    finally:
        db_sess.close()

    # Farmer One fetches their notifications
    resp1 = client.get("/farmer/notifications", headers=headers1)
    notifs1 = resp1.json()
    print("test_03 debug - farmer1 notifs:", str(notifs1).encode('ascii', 'ignore').decode('ascii'))
    assert len(notifs1) == 1
    assert notifs1[0]["id"] == notif_id

    # Farmer Two attempts to read Farmer One's notification: should fail with 404 access denied
    resp2 = client.patch(f"/farmer/notifications/{notif_id}/read", headers=headers2)
    assert resp2.status_code == 404

def test_04_notification_preferences_get_and_put(setup_users):
    headers1 = setup_users["headers1"]

    # Reset preferences directly in the database to default state to be independent of other tests
    db_sess = SessionLocal()
    try:
        farmer = db_sess.query(models.User).filter(models.User.id == setup_users["farmer1"].id).first()
        farmer.critical_alerts_only = False
        farmer.quiet_hours_start = None
        farmer.quiet_hours_end = None
        farmer.preferred_language = "en-IN"
        
        # Ensure preferences are initialized to enabled
        db_sess.query(models.NotificationPreference).filter(
            models.NotificationPreference.user_id == farmer.id
        ).delete()
        
        for channel in ["in_app", "web_push", "sms", "email"]:
            pref = models.NotificationPreference(
                user_id=farmer.id,
                channel=channel,
                enabled=True
            )
            db_sess.add(pref)
            
        db_sess.commit()
    finally:
        db_sess.close()

    # 1. Fetch preferences
    resp = client.get("/farmer/notifications/preferences", headers=headers1)
    assert resp.status_code == 200
    data = resp.json()
    assert data["push_enabled"] is True
    assert data["sms_enabled"] is True
    assert data["preferred_language"] == "en-IN"
    assert data["quiet_hours_start"] is None

    # 2. Update preferences
    payload = {
        "push_enabled": False,
        "sms_enabled": True,
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "06:00",
        "critical_alerts_only": True,
        "preferred_language": "te-IN"
    }
    resp = client.put("/farmer/notifications/preferences", json=payload, headers=headers1)
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    # 3. Retrieve and verify changes
    resp = client.get("/farmer/notifications/preferences", headers=headers1)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["push_enabled"] is False
    assert updated["quiet_hours_start"] == "22:00"
    assert updated["critical_alerts_only"] is True
    assert updated["preferred_language"] == "te-IN"

@pytest.mark.anyio
async def test_05_anti_spam_cooldown(db: Session, setup_users):
    headers1 = setup_users["headers1"]
    field1 = setup_users["field1"]

    # Delete previous notification logs for clean state
    db.query(models.NotificationLog).delete()
    db.query(models.AlertEvent).delete()
    db.commit()
    db.expire_all()

    # Trigger first alert
    alert1 = models.AlertEvent(
        field_id=field1.id,
        alert_type="low_moisture_critical",
        severity="CRITICAL",
        message="Soil moisture is at 15%",
        recommended_action="Water",
        status="active"
    )
    db.add(alert1)
    db.commit()
    db.refresh(alert1)

    await notifications.dispatch_alert_notifications(db, alert1)
    db.commit()
    db.expire_all()

    # Dispatch AGAIN for the same alert event to trigger anti-spam cooldown
    await notifications.dispatch_alert_notifications(db, alert1)
    db.commit()
    db.expire_all()

    # Check notification count: should still be 1 (second was suppressed because of cooldown!)
    resp = client.get("/farmer/notifications", headers=headers1)
    notifs = resp.json()
    print("test_05 debug - notifs returned:", str(notifs).encode('ascii', 'ignore').decode('ascii'))
    assert len(notifs) == 1

@pytest.mark.anyio
async def test_06_quiet_hours_and_critical_bypass(db: Session, setup_users):
    headers1 = setup_users["headers1"]
    field1_setup = setup_users["field1"]

    # Clear logs and expire session cache
    db.query(models.NotificationLog).delete()
    db.query(models.AlertEvent).delete()
    db.query(models.NotificationDeliveryLog).delete()
    db.commit()

    # Set farmer preferences directly in the database for this test to be independent of other tests
    farmer = db.query(models.User).filter(models.User.id == setup_users["farmer1"].id).first()
    farmer.critical_alerts_only = True
    farmer.quiet_hours_start = "22:00"
    farmer.quiet_hours_end = "06:00"
    farmer.preferred_language = "te-IN"
    db.commit()
    db.refresh(farmer)
    print("test_06 debug - database farmer critical_alerts_only:", farmer.critical_alerts_only)

    # 1. Trigger WARNING alert (non-critical)
    alert_warn = models.AlertEvent(
        field_id=field1_setup.id,
        alert_type="low_moisture_warning",
        severity="WARNING",
        message="Soil moisture falling warning.",
        recommended_action="Irrigate later.",
        status="active"
    )
    db.add(alert_warn)
    db.commit()
    db.refresh(alert_warn)

    await notifications.dispatch_alert_notifications(db, alert_warn)
    db.commit()
    db.expire_all()

    # Check delivery logs
    delivery_logs = db.query(models.NotificationDeliveryLog).filter(
        models.NotificationDeliveryLog.alert_event_id == alert_warn.id
    ).all()
    
    # Push/SMS delivery logs should be muted
    print("test_06 debug - warning delivery logs:", str([(l.channel, l.status) for l in delivery_logs]).encode('ascii', 'ignore').decode('ascii'))
    for log in delivery_logs:
        if log.channel in ["web_push", "sms"]:
            assert log.status == "muted"

    # 2. Trigger CRITICAL alert (safety-critical alerts always bypass preferences!)
    alert_crit = models.AlertEvent(
        field_id=field1_setup.id,
        alert_type="sensor_failure",
        severity="CRITICAL",
        message="Critical sensor offline.",
        recommended_action="Inspect sensor.",
        status="active"
    )
    db.add(alert_crit)
    db.commit()
    db.refresh(alert_crit)

    await notifications.dispatch_alert_notifications(db, alert_crit)
    db.commit()
    db.expire_all()

    delivery_logs_crit = db.query(models.NotificationDeliveryLog).filter(
        models.NotificationDeliveryLog.alert_event_id == alert_crit.id
    ).all()
    
    # Critical should be dispatched to push/sms (status should be sent/mocked, not muted!)
    print("test_06 debug - critical delivery logs:", str([(l.channel, l.status) for l in delivery_logs_crit]).encode('ascii', 'ignore').decode('ascii'))
    dispatched_channels = [l.channel for l in delivery_logs_crit if l.status != "muted"]
    assert "in_app" in dispatched_channels
    assert "sms" in dispatched_channels # Bypassed muting preference!
