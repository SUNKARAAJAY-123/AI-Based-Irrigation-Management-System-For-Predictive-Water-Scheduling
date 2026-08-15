import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Integer, Enum, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from database.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(50), nullable=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    preferred_language = Column(String(50), default="en-IN") # en-IN, hi-IN, kn-IN, etc.
    role = Column(String(50), default="FARMER", nullable=False, index=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("role IN ('SUPER_ADMIN', 'ADMIN', 'ADMIN_PENDING', 'FARMER')", name="check_user_role"),
        CheckConstraint("status IN ('ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED')", name="check_user_status"),
    )

    # Relationships
    farms = relationship("Farm", back_populates="owner", cascade="all, delete-orphan")


class Farm(Base):
    __tablename__ = "farms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    location_latitude = Column(Float, nullable=False)
    location_longitude = Column(Float, nullable=False)
    area_hectares = Column(Float, nullable=False)
    soil_type = Column(String(100), nullable=True) # clay, loam, sandy, silt
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="farms")
    fields = relationship("Field", back_populates="farm", cascade="all, delete-orphan")
    notifications = relationship("NotificationLog", back_populates="farm", cascade="all, delete-orphan")
    weather_records = relationship("WeatherRecord", back_populates="farm", cascade="all, delete-orphan")


class Field(Base):
    __tablename__ = "fields"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    area_hectares = Column(Float, nullable=False)
    soil_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    farm = relationship("Farm", back_populates="fields")
    crops = relationship("Crop", back_populates="field", cascade="all, delete-orphan")
    sensors = relationship("Sensor", back_populates="field", cascade="all, delete-orphan")


class Crop(Base):
    __tablename__ = "crops"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    field_id = Column(String(36), ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False) # Rice, Wheat, Cotton, Maize, Tomato, etc.
    variety = Column(String(100), nullable=True)
    planted_at = Column(DateTime, nullable=False)
    expected_harvest_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="growing") # growing, harvested, failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    field = relationship("Field", back_populates="crops")
    telemetry_logs = relationship("TelemetryLog", back_populates="crop", cascade="all, delete-orphan")
    recommendations = relationship("IrrigationRecommendation", back_populates="crop", cascade="all, delete-orphan")


class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    field_id = Column(String(36), ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    sensor_type = Column(String(100), default="soil_moisture") # soil_moisture, weather_station
    status = Column(String(50), default="active") # active, inactive
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    field = relationship("Field", back_populates="sensors")
    telemetry_logs = relationship("TelemetryLog", back_populates="sensor", cascade="all, delete-orphan")


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    crop_id = Column(String(36), ForeignKey("crops.id", ondelete="CASCADE"), nullable=False)
    sensor_id = Column(String(36), ForeignKey("sensors.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Soil metrics
    soil_moisture = Column(Float, nullable=False) # Volumetric water content (%)
    soil_temperature = Column(Float, nullable=True) # Celsius
    ph_level = Column(Float, nullable=True)
    nitrogen = Column(Float, nullable=True) # mg/kg
    phosphorus = Column(Float, nullable=True) # mg/kg
    potassium = Column(Float, nullable=True) # mg/kg
    
    # Microclimate metrics
    ambient_temperature = Column(Float, nullable=True)
    ambient_humidity = Column(Float, nullable=True)

    # Relationships
    crop = relationship("Crop", back_populates="telemetry_logs")
    sensor = relationship("Sensor", back_populates="telemetry_logs")


class IrrigationRecommendation(Base):
    __tablename__ = "irrigation_recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    crop_id = Column(String(36), ForeignKey("crops.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    recommended_water_volume_liters = Column(Float, nullable=False)
    applied_water_volume_liters = Column(Float, default=0.0)
    is_irrigation_required = Column(Boolean, default=False)
    best_irrigation_time = Column(DateTime, nullable=True)
    risk_level = Column(String(50), default="low") # low, medium, high
    status = Column(String(50), default="pending") # pending, applied, skipped, deferred
    
    # ML Metadata
    model_type = Column(String(50), default="random_forest")
    confidence_score = Column(Float, nullable=False)
    features_snapshot = Column(JSON, nullable=True) # Store exact ML features at inference time

    # Relationships
    crop = relationship("Crop", back_populates="recommendations")


class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    precipitation_probability = Column(Float, default=0.0)
    wind_speed = Column(Float, nullable=True)
    conditions = Column(String(100), nullable=True) # Sunny, Rain, Cloudy

    # Relationships
    farm = relationship("Farm", back_populates="weather_records")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    farm_id = Column(String(36), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    category = Column(String(50), default="alert") # alert, recommendation, info
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_read = Column(Boolean, default=False)

    # Relationships
    farm = relationship("Farm", back_populates="notifications")
