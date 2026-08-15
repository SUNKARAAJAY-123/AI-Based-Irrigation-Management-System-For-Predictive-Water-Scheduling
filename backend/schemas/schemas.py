from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# ------------------------------------------------------------------------------
# Token Schemas
# ------------------------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

# ------------------------------------------------------------------------------
# User Schemas
# ------------------------------------------------------------------------------
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters.")
    confirm_password: str
    phone_number: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    preferred_language: str = "en-IN"
    role: str = "FARMER" # FARMER, ADMIN, etc.

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match.")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    preferred_language: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    phone_number: Optional[str]
    state: Optional[str]
    district: Optional[str]
    preferred_language: str
    role: str
    status: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# Farm Schemas
# ------------------------------------------------------------------------------
class FarmCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    location_latitude: float = Field(..., ge=-90, le=90)
    location_longitude: float = Field(..., ge=-180, le=180)
    area_hectares: float = Field(..., gt=0, le=100000)
    soil_type: Optional[str] = None # clay, loam, sandy, silt

class FarmResponse(BaseModel):
    id: str
    user_id: str
    name: str
    location_latitude: float
    location_longitude: float
    area_hectares: float
    soil_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# Field Schemas
# ------------------------------------------------------------------------------
class FieldCreate(BaseModel):
    farm_id: str
    name: str = Field(..., min_length=1, max_length=255)
    area_hectares: float = Field(..., gt=0, le=100000)
    soil_type: Optional[str] = None

class FieldResponse(BaseModel):
    id: str
    farm_id: str
    name: str
    area_hectares: float
    soil_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# Crop Schemas
# ------------------------------------------------------------------------------
class CropCreate(BaseModel):
    field_id: str
    name: str
    variety: Optional[str] = None
    planted_at: datetime
    expected_harvest_at: Optional[datetime] = None

class CropUpdate(BaseModel):
    name: Optional[str] = None
    variety: Optional[str] = None
    planted_at: Optional[datetime] = None
    expected_harvest_at: Optional[datetime] = None
    status: Optional[str] = None # growing, harvested, failed

class CropResponse(BaseModel):
    id: str
    field_id: str
    name: str
    variety: Optional[str]
    planted_at: datetime
    expected_harvest_at: Optional[datetime]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# Sensor Schemas
# ------------------------------------------------------------------------------
class SensorCreate(BaseModel):
    field_id: str
    name: str = Field(..., min_length=1, max_length=255)
    sensor_type: str = "soil_moisture"

class SensorResponse(BaseModel):
    id: str
    field_id: str
    name: str
    sensor_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# Telemetry Schemas
# ------------------------------------------------------------------------------
class TelemetryCreate(BaseModel):
    crop_id: str
    sensor_id: Optional[str] = None
    soil_moisture: float = Field(..., ge=0, le=100)
    soil_temperature: Optional[float] = Field(None, ge=-50, le=80)
    ph_level: Optional[float] = Field(None, ge=0, le=14)
    nitrogen: Optional[float] = Field(None, ge=0, le=10000)
    phosphorus: Optional[float] = Field(None, ge=0, le=10000)
    potassium: Optional[float] = Field(None, ge=0, le=10000)
    ambient_temperature: Optional[float] = Field(None, ge=-50, le=80)
    ambient_humidity: Optional[float] = Field(None, ge=0, le=100)

class TelemetryResponse(BaseModel):
    id: str
    crop_id: str
    sensor_id: Optional[str]
    timestamp: datetime
    soil_moisture: float
    soil_temperature: Optional[float]
    ph_level: Optional[float]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    ambient_temperature: Optional[float]
    ambient_humidity: Optional[float]

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# Recommendation Schemas
# ------------------------------------------------------------------------------
class RecommendationResponse(BaseModel):
    id: str
    crop_id: str
    timestamp: datetime
    recommended_water_volume_liters: float
    applied_water_volume_liters: float
    is_irrigation_required: bool
    best_irrigation_time: Optional[datetime]
    risk_level: str
    status: str
    model_type: str
    confidence_score: float
    features_snapshot: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# Weather Schemas
# ------------------------------------------------------------------------------
class WeatherForecastItem(BaseModel):
    dt_txt: str
    temp: float
    humidity: int
    wind_speed: float
    rain_probability: float
    description: str

class WeatherCurrentResponse(BaseModel):
    time: str
    temperature: float
    humidity: int
    wind_speed: float
    pressure: Optional[float] = None
    cloud_cover: Optional[int] = None
    uv_index: Optional[float] = None
    rain_probability: float
    description: str

class WeatherHourlyItem(BaseModel):
    time: str
    temperature: float
    humidity: int
    wind_speed: float
    pressure: Optional[float] = None
    cloud_cover: Optional[int] = None
    uv_index: Optional[float] = None
    rain_probability: float
    description: str

class WeatherDailyItem(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    rain_probability: float
    wind_speed: float
    uv_index: Optional[float] = None
    sunrise: Optional[str] = None
    sunset: Optional[str] = None
    description: str

class WeatherSummaryResponse(BaseModel):
    temp: float
    humidity: int
    wind_speed: float
    conditions: str
    forecast: List[WeatherForecastItem]
    current: WeatherCurrentResponse
    hourly: List[WeatherHourlyItem]
    daily: List[WeatherDailyItem]

# ------------------------------------------------------------------------------
# Notification Schemas
# ------------------------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: str
    farm_id: str
    title: str
    message: str
    category: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


# ------------------------------------------------------------------------------
# Admin Schemas
# ------------------------------------------------------------------------------
class AdminStats(BaseModel):
    total_users: int
    total_farms: int
    total_fields: int
    total_sensors: int
    sensors_active: int
    sensors_inactive: int
    active_crops: int
    total_water_recommended_liters: float
    total_water_applied_liters: float
    average_confidence: float

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None

class AdminBroadcastNotification(BaseModel):
    title: str
    message: str
    category: str = "alert"

class AdminReportItem(BaseModel):
    crop_name: str
    recommended_volume: float
    applied_volume: float
    avg_confidence: float
    recommendations_count: int


# ------------------------------------------------------------------------------
# ML Predict Schemas (Phase 8)
# ------------------------------------------------------------------------------
class MLPredictRequest(BaseModel):
    temperature: Optional[float] = Field(None, ge=-50, le=80)
    temperature_c: Optional[float] = Field(None, ge=-50, le=80)
    humidity: float = Field(..., ge=0, le=100)
    rainfall: Optional[float] = Field(None, ge=0, le=5000)
    rainfall_mm: Optional[float] = Field(None, ge=0, le=5000)
    soil_moisture: float = Field(..., ge=0, le=100)
    crop: Optional[str] = Field(None)
    crop_type: Optional[str] = Field(None)
    soil_type: str = Field(..., min_length=1)
    model: Optional[str] = None
    
    # New fields for scheduling & timing
    crop_growth_stage: Optional[str] = None
    soil_ph: Optional[float] = None
    organic_carbon: Optional[float] = None
    electrical_conductivity: Optional[float] = None
    N: Optional[float] = None
    P: Optional[float] = None
    K: Optional[float] = None
    sunlight_hours: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    season: Optional[str] = None
    irrigation_type: Optional[str] = None
    water_source: Optional[str] = None
    field_area_hectare: Optional[float] = None
    field_area_acres: Optional[float] = None
    mulching_used: Optional[str] = None
    previous_irrigation_mm: Optional[float] = None
    region: Optional[str] = None
    ET_index: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    field_id: Optional[str] = None

class MLPredictResponse(BaseModel):
    water_required: float
    recommendation: str
    confidence: float
    model_type: Optional[str] = None
    prediction_time_ms: Optional[float] = None
    display_name: Optional[str] = None
    
    # Extended JSON structure fields
    model: Optional[str] = None
    prediction: Optional[Dict[str, Any]] = None
    field: Optional[Dict[str, Any]] = None
    irrigation_schedule: Optional[Dict[str, Any]] = None

class MLTrainRequest(BaseModel):
    models: List[str] = Field(default=["random_forest", "gradient_boosting", "xgboost", "lstm"])
    weights: Optional[Dict[str, float]] = None

class MLTrainResponse(BaseModel):
    status: str
    message: str
    best_model: Optional[str] = None

class MLTrainingStatusResponse(BaseModel):
    status: str
    current_model: str
    progress: int
    logs: List[str]
    error: Optional[str] = None
    results: Optional[List[Any]] = None

class MLSetProductionModelRequest(BaseModel):
    model: str = Field(..., min_length=1)

class MLSetProductionModelResponse(BaseModel):
    status: str
    production_model: str
    message: str



# ------------------------------------------------------------------------------
# RBAC Approval Schemas
# ------------------------------------------------------------------------------
class AdminRequestApproval(BaseModel):
    notes: Optional[str] = None

class AdminRequestRejection(BaseModel):
    rejection_reason: Optional[str] = None


