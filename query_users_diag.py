import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.database import SessionLocal
from database import models

db = SessionLocal()
users = db.query(models.User).all()
print(f"Total users: {len(users)}")
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Language: {u.preferred_language}, CriticalAlertsOnly: {u.critical_alerts_only}, QuietHours: {u.quiet_hours_start}-{u.quiet_hours_end}")
db.close()
