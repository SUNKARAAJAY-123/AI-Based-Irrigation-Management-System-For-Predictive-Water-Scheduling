import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add project root to python path at index 0 to avoid shadowing package imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app
from database.database import SessionLocal
from database.models import User, Farm
from database.seed import seed_super_admin

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    seed_super_admin()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_01_super_admin_seed(db_session):
    # Verify Super Admin exists in the database
    super_admin = db_session.query(User).filter(User.email == "sunkaraajay66@gmail.com").first()
    assert super_admin is not None
    assert super_admin.role == "SUPER_ADMIN"
    assert super_admin.status == "ACTIVE"

def test_02_auth_register_and_login():
    # 1. Register a new farmer
    farmer_email = "testfarmer@example.com"
    register_payload = {
        "email": farmer_email,
        "password": "Password@123",
        "confirm_password": "Password@123",
        "full_name": "Test Farmer",
        "phone_number": "1234567890",
        "state": "Karnataka",
        "district": "Bellary",
        "preferred_language": "en-IN",
        "role": "FARMER"
    }
    
    # Ensure clean state if test was run before
    db = SessionLocal()
    existing = db.query(User).filter(User.email == farmer_email).first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()
    
    response = client.post("/users/register", json=register_payload)
    assert response.status_code == 200, response.text
    
    # 2. Login as farmer
    login_payload = {
        "email": farmer_email,
        "password": "Password@123"
    }
    response = client.post("/users/login", json=login_payload)
    assert response.status_code == 200, response.text
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    
    # 3. Login with incorrect password
    bad_login = {
        "email": farmer_email,
        "password": "WrongPassword"
    }
    response = client.post("/users/login", json=bad_login)
    assert response.status_code == 400

def test_03_admin_pending_approval():
    # 1. Register a new admin (should go to PENDING)
    admin_email = "testadmin_pending@example.com"
    register_payload = {
        "email": admin_email,
        "password": "Password@123",
        "confirm_password": "Password@123",
        "full_name": "Test Admin",
        "phone_number": "0987654321",
        "state": "Andhra Pradesh",
        "district": "Anantapur",
        "preferred_language": "en-IN",
        "role": "ADMIN"
    }
    
    db = SessionLocal()
    existing = db.query(User).filter(User.email == admin_email).first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()

    response = client.post("/users/register", json=register_payload)
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "PENDING"
    
    # 2. Login attempt (should return 403 Forbidden because PENDING)
    login_payload = {
        "email": admin_email,
        "password": "Password@123"
    }
    response = client.post("/users/login", json=login_payload)
    assert response.status_code == 403
    assert "awaiting approval" in response.json()["detail"]

def test_04_block_super_admin_registration():
    # Try to register directly as SUPER_ADMIN (should be blocked)
    payload = {
        "email": "hacker_sa@example.com",
        "password": "Password@123",
        "confirm_password": "Password@123",
        "full_name": "Fake SA",
        "role": "SUPER_ADMIN"
    }
    response = client.post("/users/register", json=payload)
    assert response.status_code == 400
    assert "Invalid registration role" in response.json()["detail"]

def test_05_rbac_privilege_escapes():
    # 1. Login as Farmer
    farmer_payload = {
        "email": "testfarmer@example.com",
        "password": "Password@123"
    }
    resp = client.post("/users/login", json=farmer_payload)
    farmer_token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {farmer_token}"}
    
    # 2. Try to access Admin Stats (should return 403)
    response = client.get("/admin/stats", headers=headers)
    assert response.status_code == 403
    
    # 3. Try to access Pending Approvals list (should return 403)
    response = client.get("/admin/requests", headers=headers)
    assert response.status_code == 403

def test_06_super_admin_approvals():
    # 1. Login as Super Admin
    sa_payload = {
        "email": "sunkaraajay66@gmail.com",
        "password": "Password@123"
    }
    resp = client.post("/users/login", json=sa_payload)
    sa_token = resp.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    
    # 2. Get pending requests
    response = client.get("/admin/requests", headers=sa_headers)
    assert response.status_code == 200
    pending_list = response.json()
    
    target_admin = next((u for u in pending_list if u["email"] == "testadmin_pending@example.com"), None)
    assert target_admin is not None
    
    # 3. Approve the admin
    approve_response = client.post(f"/admin/requests/{target_admin['id']}/approve", json={"notes": "Approved for test"}, headers=sa_headers)
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "ACTIVE"
    
    # 4. Try logging in now as the approved admin
    admin_payload = {
        "email": "testadmin_pending@example.com",
        "password": "Password@123"
    }
    admin_resp = client.post("/users/login", json=admin_payload)
    assert admin_resp.status_code == 200
    assert "access_token" in admin_resp.json()

def test_07_one_super_admin_limit():
    # 1. Login as Approved Admin
    admin_payload = {
        "email": "testadmin_pending@example.com",
        "password": "Password@123"
    }
    admin_resp = client.post("/users/login", json=admin_payload)
    admin_token = admin_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Retrieve own profile details
    profile_resp = client.get("/users/profile", headers=admin_headers)
    user_id = profile_resp.json()["id"]
    
    # 3. Try to promote a regular user or self to SUPER_ADMIN (should return 400 or 403 because admin cannot edit users)
    update_payload = {
        "role": "SUPER_ADMIN"
    }
    response = client.put(f"/admin/users/{user_id}/status", json=update_payload, headers=admin_headers)
    # Approved admin is blocked because current_admin dependency requires SUPER_ADMIN for this endpoint!
    assert response.status_code in [400, 403]

def test_08_idor_horizontal_escapes():
    # 1. Create two farmers
    db = SessionLocal()
    for email in ["farmer_a@example.com", "farmer_b@example.com"]:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.delete(existing)
            db.commit()
    db.close()
    
    client.post("/users/register", json={
        "email": "farmer_a@example.com", "password": "Password@123", "confirm_password": "Password@123",
        "full_name": "Farmer A", "phone_number": "1111111111", "role": "FARMER"
    })
    client.post("/users/register", json={
        "email": "farmer_b@example.com", "password": "Password@123", "confirm_password": "Password@123",
        "full_name": "Farmer B", "phone_number": "2222222222", "role": "FARMER"
    })
    
    # Log in as Farmer A and create a farm
    resp_a = client.post("/users/login", json={"email": "farmer_a@example.com", "password": "Password@123"})
    token_a = resp_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    farm_payload = {
        "name": "Farm A",
        "area_hectares": 2.0,
        "soil_type": "Clay",
        "location_latitude": 15.3048,
        "location_longitude": 76.9084
    }
    farm_resp = client.post("/farms", json=farm_payload, headers=headers_a)
    assert farm_resp.status_code == 200, farm_resp.text
    farm_id = farm_resp.json()["id"]
    
    # Log in as Farmer B and try to delete/read Farmer A's farm
    resp_b = client.post("/users/login", json={"email": "farmer_b@example.com", "password": "Password@123"})
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Attempt delete
    del_resp = client.delete(f"/farms/{farm_id}", headers=headers_b)
    assert del_resp.status_code == 404 # Should deny access or report not found

def test_09_ml_prediction_validation():
    # 1. Query with invalid fields (e.g. string for temperature, negative humidity)
    bad_payload = {
        "model": "xgboost",
        "temperature": "very_hot",
        "humidity": -25.0,
        "rainfall": 5.0,
        "soil_moisture": 30.0,
        "crop_type": "Rice",
        "soil_type": "Clay"
    }
    response = client.post("/api/ml/predict", json=bad_payload)
    assert response.status_code == 422 # Pydantic Validation Error
    
    # 2. Query with valid fields
    good_payload = {
        "model": "random_forest",
        "temperature": 32.0,
        "humidity": 65.0,
        "rainfall": 5.0,
        "soil_moisture": 30.0,
        "crop_type": "Rice",
        "soil_type": "Clay"
    }
    response = client.post("/api/ml/predict", json=good_payload)
    assert response.status_code == 200
    res_data = response.json()
    assert "water_required" in res_data
    assert res_data["model_type"] == "random_forest"
