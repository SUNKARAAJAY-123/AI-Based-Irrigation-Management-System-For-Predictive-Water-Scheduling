import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.database import SessionLocal
from database import models

db = SessionLocal()

print("=" * 80)
print("              NOTIFICATION SYSTEM DIAGNOSTIC REPORT")
print("=" * 80)

# 1. Query Users
users = db.query(models.User).all()
print(f"\n[1] TOTAL REGISTERED USERS: {len(users)}")
print("-" * 80)
for u in users:
    print(f"User ID:   {u.id}")
    print(f"Email:     {u.email}")
    print(f"Role:      {u.role}")
    print(f"Language:  {u.preferred_language}")
    print(f"Mute Mode: Critical Alerts Only: {u.critical_alerts_only} | Quiet Hours: {u.quiet_hours_start}-{u.quiet_hours_end}")
    print("-" * 40)

# 2. Query Alert Events
alerts_list = db.query(models.AlertEvent).order_by(models.AlertEvent.created_at.desc()).all()
print(f"\n[2] EVALUATED ALERTS: {len(alerts_list)}")
print("-" * 80)
if not alerts_list:
    print("No alert events recorded yet.")
else:
    for a in alerts_list:
        status_symbol = "[RESOLVED]" if a.status == "resolved" else "[ACTIVE]"
        print(f"{status_symbol} Type: {a.alert_type} | Severity: {a.severity}")
        print(f"  Field ID:          {a.field_id}")
        print(f"  Message:           {a.message}")
        print(f"  Condition Trigger: {a.condition}")
        if a.status == "resolved":
            print(f"  Resolution Reason: {a.resolution_reason}")
            print(f"  Resolved At:       {a.resolved_at}")
        else:
            print(f"  Created At:        {a.created_at}")
        print("-" * 40)

# 3. Query Notification Logs
logs = db.query(models.NotificationLog).order_by(models.NotificationLog.created_at.desc()).limit(15).all()
print(f"\n[3] RECENT NOTIFICATION LOGS (Limit 15): {len(logs)}")
print("-" * 80)
if not logs:
    print("No notification logs written yet.")
else:
    for l in logs:
        print(f"ID:       {l.id}")
        print(f"Title:    {l.title}")
        print(f"Target:   User {l.farmer_id} | Field {l.field_id}")
        print(f"Channel:  {l.channel} | Language: {l.language}")
        print(f"Category: {l.category} | Sent At: {l.sent_at}")
        print("-" * 40)

# 4. Query Delivery Status
deliveries = db.query(models.NotificationDeliveryLog).order_by(models.NotificationDeliveryLog.created_at.desc()).limit(15).all()
print(f"\n[4] RECENT DELIVERY ACTIONS (Limit 15): {len(deliveries)}")
print("-" * 80)
if not deliveries:
    print("No notification delivery actions logged yet.")
else:
    for d in deliveries:
        status_marker = "[SENT]" if d.status == "sent" else ("[FAILED]" if d.status == "failed" else "[MUTED]")
        print(f"{status_marker} Channel: {d.channel}")
        print(f"  Alert Event ID: {d.alert_event_id}")
        print(f"  User ID:        {d.user_id}")
        if d.error_message:
            print(f"  Error Detail:   {d.error_message}")
        print(f"  Logged At:      {d.created_at}")
        print("-" * 40)

print("=" * 80)
db.close()
