import os
import sys

# Add project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.database import SessionLocal
from database.models import User

def show_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"{'ID':<36} | {'Email':<25} | {'Role':<15} | {'Status':<10} | {'Is Active':<10}")
        print("-" * 105)
        for u in users:
            print(f"{u.id:<36} | {u.email:<25} | {u.role:<15} | {str(u.status):<10} | {str(u.is_active):<10}")
    finally:
        db.close()

if __name__ == "__main__":
    show_users()
