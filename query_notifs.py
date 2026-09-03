import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.database import SessionLocal
from database import models

db = SessionLocal()
farmer_id = "0fc04335-c8f9-4876-81a9-f25fe2a41c9c"
farm_ids = ["49a14b3e-b763-4d44-90f7-a41da47b4d9b"]

query = db.query(models.NotificationLog).filter(
    (models.NotificationLog.farmer_id == farmer_id) |
    (models.NotificationLog.farmer_id.is_(None) & models.NotificationLog.farm_id.in_(farm_ids))
)

notifs = query.all()
print(f"Filtered notifications count: {len(notifs)}")
for n in notifs:
    print(f"ID: {n.id}, Farm ID: {n.farm_id}, Farmer ID: {n.farmer_id}, Title: {n.title}")

db.close()
