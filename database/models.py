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
    quiet_hours_start = Column(String(5), nullable=True) # HH:MM format
    quiet_hours_end = Column(String(5), nullable=True) # HH:MM format
    critical_alerts_only = Column(Boolean, default=False)
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
    push_subscriptions = relationship("PushSubscription", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", cascade="all, delete-orphan")


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
    thresholds = relationship("FieldThreshold", back_populates="field", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("AlertEvent", back_populates="field", cascade="all, delete-orphan")


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
    farmer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    field_id = Column(String(36), ForeignKey("fields.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    category = Column(String(50), default="alert") # alert, recommendation, info
    severity = Column(String(50), nullable=True) # CRITICAL, WARNING, INFO
    recommended_action = Column(String(500), nullable=True)
    notification_type = Column(String(100), nullable=True)
    alert_id = Column(String(36), ForeignKey("alert_events.id", ondelete="SET NULL"), nullable=True)
    channel = Column(String(50), nullable=True)
    language = Column(String(50), nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    read_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)
    notification_metadata = Column(JSON, nullable=True)

    # Relationships
    farm = relationship("Farm", back_populates="notifications")
    field = relationship("Field")
    farmer = relationship("User", foreign_keys=[farmer_id])


class FieldThreshold(Base):
    __tablename__ = "field_thresholds"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    field_id = Column(String(36), ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, unique=True)
    critical_moisture = Column(Float, default=25.0, nullable=False)
    warning_moisture = Column(Float, default=35.0, nullable=False)
    overwatering_moisture = Column(Float, default=70.0, nullable=False)
    rain_probability_threshold = Column(Float, default=0.60, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    field = relationship("Field", back_populates="thresholds")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String(500), nullable=False)
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="push_subscriptions")


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    field_id = Column(String(36), ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(100), nullable=False) # e.g. low_moisture, overwatering, sensor_failure
    severity = Column(String(50), nullable=False) # CRITICAL, WARNING, INFO
    message = Column(String(500), nullable=False)
    recommended_action = Column(String(500), nullable=True)
    status = Column(String(50), default="active", nullable=False) # active, resolved, acknowledged, expired
    resolution_reason = Column(String(500), nullable=True)
    condition = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    field = relationship("Field", back_populates="alerts")
    delivery_logs = relationship("NotificationDeliveryLog", back_populates="alert_event", cascade="all, delete-orphan")


class NotificationDeliveryLog(Base):
    __tablename__ = "notification_delivery_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    alert_event_id = Column(String(36), ForeignKey("alert_events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel = Column(String(50), nullable=False) # web_push, sms, email, in_app
    status = Column(String(50), nullable=False) # sent, failed, pending
    retry_count = Column(Integer, default=0, nullable=False)
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    alert_event = relationship("AlertEvent", back_populates="delivery_logs")
    user = relationship("User")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel = Column(String(50), nullable=False) # web_push, sms, email, in_app
    enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="notification_preferences")


class CropDiseaseScan(Base):
    __tablename__ = "crop_disease_scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    field_id = Column(String(36), ForeignKey("fields.id", ondelete="SET NULL"), nullable=True)
    image_url = Column(String(500), nullable=True)
    disease_name = Column(String(255), nullable=False)
    confidence_score = Column(Float, nullable=False)
    severity = Column(String(50), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    symptoms = Column(JSON, nullable=True)
    recommended_action = Column(String(1000), nullable=True)
    audio_base64 = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")
    field = relationship("Field")


class FarmerAIFeedback(Base):
    __tablename__ = "farmer_ai_feedbacks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recommendation_id = Column(String(36), ForeignKey("irrigation_recommendations.id", ondelete="CASCADE"), nullable=False)
    followed_status = Column(String(50), nullable=False) # Followed, Partially Followed, Not Followed
    reason = Column(String(255), nullable=True)
    explanation = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")
    recommendation = relationship("IrrigationRecommendation")


class ModelTrainingRun(Base):
    __tablename__ = "model_training_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_type = Column(String(50), nullable=False) # random_forest, gradient_boosting, xgboost, etc.
    version = Column(String(50), nullable=False)
    status = Column(String(50), default="completed") # completed, failed, active
    metrics = Column(JSON, nullable=False) # evaluation metrics
    hyperparameters = Column(JSON, nullable=True)
    is_deployed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

