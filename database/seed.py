import os
import sys
from sqlalchemy.orm import Session

# Add project root to python path to resolve database and backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.database import SessionLocal
from database.models import User
from backend.auth.jwt import hash_password

def seed_super_admin():
    db: Session = SessionLocal()
    try:
        # Check if SUPER_ADMIN already exists
        super_admin_email = "sunkaraajay66@gmail.com"
        existing = db.query(User).filter(User.email == super_admin_email).first()
        
        if existing:
            print(f"Super Admin user '{super_admin_email}' already exists. Skipping seed.")
            # Ensure the existing user has correct roles/status
            if existing.role != "SUPER_ADMIN" or existing.status != "ACTIVE":
                existing.role = "SUPER_ADMIN"
                existing.status = "ACTIVE"
                existing.is_active = True
                db.commit()
                print("Super Admin role/status forced to SUPER_ADMIN/ACTIVE.")
            return

        # Double check if any user has SUPER_ADMIN role (system must have ONLY ONE)
        any_super_admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()
        if any_super_admin:
            print(f"Error: Another SUPER_ADMIN account '{any_super_admin.email}' already exists. Cannot seed another one.")
            return

        print("Seeding Super Admin user...")
        hashed_pwd = hash_password("Password@123")
        
        new_super_admin = User(
            email=super_admin_email,
            hashed_password=hashed_pwd,
            full_name="Super Admin",
            phone_number="+919999999999",
            state="Andhra Pradesh",
            district="Anantapur",
            preferred_language="en-IN",
            role="SUPER_ADMIN",
            status="ACTIVE",
            is_active=True
        )
        db.add(new_super_admin)
        db.commit()
        print("Super Admin seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding Super Admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_super_admin()
