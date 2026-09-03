import os
import sys
from fastapi.testclient import TestClient

# Add project root to python path at index 0 to avoid shadowing package imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app

client = TestClient(app)

def test_prediction_timing_api():
    payload = {
        "crop_type": "Rice",
        "crop_growth_stage": "Vegetative",
        "soil_type": "Clay",
        "soil_ph": 6.5,
        "soil_moisture": 32.5,
        "organic_carbon": 1.8,
        "electrical_conductivity": 0.65,
        "N": 90,
        "P": 42,
        "K": 38,
        "temperature_c": 30.5,
        "humidity": 72,
        "rainfall_mm": 4.5,
        "sunlight_hours": 7.5,
        "wind_speed_kmh": 12.0,
        "season": "Kharif",
        "irrigation_type": "Flood",
        "water_source": "Canal",
        "field_area_hectare": 0.404686,
        "mulching_used": "No",
        "previous_irrigation_mm": 18.0,
        "region": "Andhra Pradesh",
        "ET_index": 4.2,
        "model": "random_forest"
    }

    response = client.post("/api/ml/predict", json=payload)
    assert response.status_code == 200, response.text
    
    data = response.json()
    print("API RESPONSE:", data)
    
    # Verify backward compatibility fields
    assert "water_required" in data
    assert "recommendation" in data
    assert "confidence" in data
    assert "model_type" in data
    
    # Verify new structured response fields
    assert "model" in data
    assert "prediction" in data
    assert "water_required_mm" in data["prediction"]
    assert "field" in data
    assert "area_acres" in data["field"]
    assert "total_water_litres" in data["field"]
    assert "irrigation_schedule" in data
    
    schedule = data["irrigation_schedule"]
    assert "status" in schedule
    assert "days_until_irrigation" in schedule
    assert "recommended_date" in schedule
    assert "recommended_time" in schedule
    assert "display_time" in schedule
    assert "timezone" in schedule
    assert "reason" in schedule
    
    # Verify values are reasonable
    assert abs(data["field"]["area_acres"] - 1.0) < 0.05  # since 0.404686 hectares ≈ 1.0 acres
    assert schedule["timezone"] == "Asia/Kolkata"
    assert schedule["days_until_irrigation"] >= 0
    print("TEST PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_prediction_timing_api()
