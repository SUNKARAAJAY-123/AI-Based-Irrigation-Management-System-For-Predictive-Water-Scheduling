from database.database import SessionLocal
from database import models

db = SessionLocal()
notifs = db.query(models.NotificationLog).all()
print(f"Total notification logs in DB: {len(notifs)}")
for n in notifs:
    print(f"ID: {n.id}, Farm ID: {n.farm_id}, Farmer ID: {n.farmer_id}, Title: {n.title}, Category: {n.category}, Is Read: {n.is_read}")
db.close()
