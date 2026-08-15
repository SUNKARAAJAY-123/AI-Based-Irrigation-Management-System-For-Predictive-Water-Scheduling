import os
import sys

# Add project root to python path at index 0 to avoid shadowing package imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.database import SessionLocal
from database.models import User
from backend.auth.jwt import hash_password, verify_password

def run_tests():
    db = SessionLocal()
    print("Executing automated RBAC verification tests...")
    
    try:
        # Test 1: Verify Super Admin seed
        super_admin = db.query(User).filter(User.email == "sunkaraajay66@gmail.com").first()
        assert super_admin is not None, "Super Admin was not seeded!"
        assert super_admin.role == "SUPER_ADMIN", "Super Admin role is incorrect!"
        assert super_admin.status == "ACTIVE", "Super Admin status is incorrect!"
        assert verify_password("Password@123", super_admin.hashed_password), "Super Admin password verification failed!"
        print("OK - Test 1: Super Admin seed verified successfully.")

        # Test 2: Check CHECK constraints on role and status
        # We try to create a user with invalid role/status to verify constraints
        import sqlalchemy.exc
        
        # Invalid role
        bad_user_role = User(
            email="badrole@example.com",
            hashed_password=hash_password("password123"),
            full_name="Bad Role User",
            role="INVALID_ROLE",
            status="ACTIVE"
        )
        db.add(bad_user_role)
        try:
            db.commit()
            assert False, "Database constraint check failed for invalid role!"
        except sqlalchemy.exc.IntegrityError:
            db.rollback()
            print("OK - Test 2.1: Invalid role CHECK constraint verified successfully.")

        # Invalid status
        bad_user_status = User(
            email="badstatus@example.com",
            hashed_password=hash_password("password123"),
            full_name="Bad Status User",
            role="FARMER",
            status="INVALID_STATUS"
        )
        db.add(bad_user_status)
        try:
            db.commit()
            assert False, "Database constraint check failed for invalid status!"
        except sqlalchemy.exc.IntegrityError:
            db.rollback()
            print("OK - Test 2.2: Invalid status CHECK constraint verified successfully.")

        print("\nAll automated database tests completed successfully!")
    except AssertionError as ae:
        print(f"FAIL - Test verification failed: {ae}")
    except Exception as e:
        print(f"FAIL - Unexpected error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
