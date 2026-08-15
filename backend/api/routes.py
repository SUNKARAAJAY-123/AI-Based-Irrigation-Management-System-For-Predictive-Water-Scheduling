from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Literal, Optional, Dict, Any
import uuid

from database.database import get_db
from database import models
from backend.schemas import schemas
from backend.auth import jwt
from backend.services import weather, sarvam_ai, scheduling
from ml import predict
from ml.predict import predict_water_requirement

router = APIRouter()
security = HTTPBearer()

# ------------------------------------------------------------------------------
# Authentication & Role Dependency
# ------------------------------------------------------------------------------
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> models.User:
    token = credentials.credentials
    payload = jwt.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    # Validate active status and check status
    if user.status != "ACTIVE" or not user.is_active:
        if user.status == "PENDING":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your Admin account is awaiting approval from the Super Admin."
            )
        elif user.status == "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your Admin registration request has been rejected."
            )
        elif user.status == "SUSPENDED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been suspended."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive or unavailable"
            )
            
    return user

def require_role(allowed_roles: List[str]):
    def dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied. Required role in: {allowed_roles}"
            )
        return current_user
    return dependency

require_super_admin = require_role(["SUPER_ADMIN"])
require_admin_or_super_admin = require_role(["ADMIN", "SUPER_ADMIN"])
require_farmer = require_role(["FARMER"])

# ------------------------------------------------------------------------------
# Auth Endpoints
# ------------------------------------------------------------------------------
@router.post("/users/register")
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    requested_role = user_data.role.upper()
    if requested_role not in ["FARMER", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid registration role")
        
    # Prevent registration of SUPER_ADMIN
    if requested_role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Cannot register as SUPER_ADMIN")
        
    hashed_pwd = jwt.hash_password(user_data.password)
    
    if requested_role == "ADMIN":
        new_user = models.User(
            email=user_data.email,
            hashed_password=hashed_pwd,
            full_name=user_data.full_name,
            phone_number=user_data.phone_number,
            state=user_data.state,
            district=user_data.district,
            preferred_language=user_data.preferred_language,
            role="ADMIN_PENDING",
            status="PENDING",
            is_active=False
        )
        db.add(new_user)
        db.commit()
        return {
            "success": True,
            "status": "PENDING",
            "message": "Your Admin registration request has been submitted successfully. Your account will become active only after approval from the Super Admin."
        }
    else: # FARMER
        new_user = models.User(
            email=user_data.email,
            hashed_password=hashed_pwd,
            full_name=user_data.full_name,
            phone_number=user_data.phone_number,
            state=user_data.state,
            district=user_data.district,
            preferred_language=user_data.preferred_language,
            role="FARMER",
            status="ACTIVE",
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generate token
        access_token = jwt.create_access_token(data={
            "sub": new_user.id,
            "email": new_user.email,
            "role": new_user.role,
            "status": new_user.status
        })
        return {"access_token": access_token, "token_type": "bearer"}

@router.post("/users/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not jwt.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    if user.status != "ACTIVE" or not user.is_active:
        if user.status == "PENDING":
            raise HTTPException(
                status_code=403,
                detail="Your Admin account is awaiting approval from the Super Admin."
            )
        elif user.status == "REJECTED":
            raise HTTPException(
                status_code=403,
                detail="Your Admin registration request has been rejected."
            )
        elif user.status == "SUSPENDED":
            raise HTTPException(
                status_code=403,
                detail="Your account has been suspended."
            )
        else:
            raise HTTPException(
                status_code=403,
                detail="User account is inactive or unavailable"
            )
        
    access_token = jwt.create_access_token(data={
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "status": user.status
    })
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/profile", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/users/profile", response_model=schemas.UserResponse)
def update_profile(profile_data: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user

# ------------------------------------------------------------------------------
# Farm Endpoints
# ------------------------------------------------------------------------------
@router.post("/farms", response_model=schemas.FarmResponse)
def create_farm(farm: schemas.FarmCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_farm = models.Farm(
        user_id=current_user.id,
        name=farm.name,
        location_latitude=farm.location_latitude,
        location_longitude=farm.location_longitude,
        area_hectares=farm.area_hectares,
        soil_type=farm.soil_type
    )
    db.add(new_farm)
    db.commit()
    db.refresh(new_farm)
    return new_farm

@router.get("/farms", response_model=List[schemas.FarmResponse])
def get_farms(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()

@router.delete("/farms/{farm_id}")
def delete_farm(farm_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = db.query(models.Farm).filter(models.Farm.id == farm_id, models.Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or access denied")
    db.delete(farm)
    db.commit()
    return {"detail": "Farm deleted successfully"}

# ------------------------------------------------------------------------------
# Field Endpoints
# ------------------------------------------------------------------------------
@router.post("/fields", response_model=schemas.FieldResponse)
def create_field(field: schemas.FieldCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify farm ownership
    farm = db.query(models.Farm).filter(models.Farm.id == field.farm_id, models.Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or access denied")
        
    new_field = models.Field(
        farm_id=field.farm_id,
        name=field.name,
        area_hectares=field.area_hectares,
        soil_type=field.soil_type
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field

@router.get("/fields", response_model=List[schemas.FieldResponse])
def get_fields(farm_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify farm ownership
    farm = db.query(models.Farm).filter(models.Farm.id == farm_id, models.Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or access denied")
    return db.query(models.Field).filter(models.Field.farm_id == farm_id).all()

@router.delete("/fields/{field_id}")
def delete_field(field_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == field_id, 
        models.Farm.user_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")
    db.delete(field)
    db.commit()
    return {"detail": "Field deleted successfully"}

# ------------------------------------------------------------------------------
# Crop Endpoints
# ------------------------------------------------------------------------------
@router.post("/crops", response_model=schemas.CropResponse)
def create_crop(crop: schemas.CropCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify field ownership
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == crop.field_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")
        
    new_crop = models.Crop(
        field_id=crop.field_id,
        name=crop.name,
        variety=crop.variety,
        planted_at=crop.planted_at,
        expected_harvest_at=crop.expected_harvest_at,
        status="growing"
    )
    db.add(new_crop)
    db.commit()
    db.refresh(new_crop)
    return new_crop

@router.put("/crops/{crop_id}", response_model=schemas.CropResponse)
def update_crop(crop_id: str, crop_data: schemas.CropUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    crop = db.query(models.Crop).join(models.Field).join(models.Farm).filter(
        models.Crop.id == crop_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found or access denied")
        
    for key, value in crop_data.model_dump(exclude_unset=True).items():
        setattr(crop, key, value)
        
    db.commit()
    db.refresh(crop)
    return crop

@router.get("/crops", response_model=List[schemas.CropResponse])
def get_crops(field_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify field ownership
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == field_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")
    return db.query(models.Crop).filter(models.Crop.field_id == field_id).all()

# ------------------------------------------------------------------------------
# Sensor Endpoints
# ------------------------------------------------------------------------------
@router.post("/sensors", response_model=schemas.SensorResponse)
def create_sensor(sensor: schemas.SensorCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == sensor.field_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")
        
    new_sensor = models.Sensor(
        field_id=sensor.field_id,
        name=sensor.name,
        sensor_type=sensor.sensor_type,
        status="active"
    )
    db.add(new_sensor)
    db.commit()
    db.refresh(new_sensor)
    return new_sensor

@router.get("/sensors", response_model=List[schemas.SensorResponse])
def get_sensors(field_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == field_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")
    return db.query(models.Sensor).filter(models.Sensor.field_id == field_id).all()

# ------------------------------------------------------------------------------
# Telemetry and ML Predict Route
# ------------------------------------------------------------------------------
@router.post("/sensors/{sensor_id}/telemetry", response_model=schemas.RecommendationResponse)
async def post_telemetry(sensor_id: str, telemetry: schemas.TelemetryCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Verify crop ownership
    crop = db.query(models.Crop).join(models.Field).join(models.Farm).filter(
        models.Crop.id == telemetry.crop_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found or access denied")

    sensor = db.query(models.Sensor).join(models.Field).join(models.Farm).filter(
        models.Sensor.id == sensor_id,
        models.Farm.user_id == current_user.id,
    ).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found or access denied")
    if sensor.field_id != crop.field_id:
        raise HTTPException(status_code=422, detail="Sensor and crop must belong to the same field")
        
    # 2. Get Weather parameters for Farm
    farm = crop.field.farm
    w_data = await weather.fetch_weather_data(farm.location_latitude, farm.location_longitude)
    
    # Save a weather record in historical table
    w_record = models.WeatherRecord(
        farm_id=farm.id,
        temperature=w_data["temp"],
        humidity=w_data["humidity"],
        precipitation_probability=w_data["forecast"][0]["rain_probability"] if w_data["forecast"] else 0.0,
        wind_speed=w_data["wind_speed"],
        conditions=w_data["conditions"]
    )
    db.add(w_record)
    
    # 3. Save telemetry log
    new_telemetry = models.TelemetryLog(
        crop_id=telemetry.crop_id,
        sensor_id=sensor_id,
        soil_moisture=telemetry.soil_moisture,
        soil_temperature=telemetry.soil_temperature,
        ph_level=telemetry.ph_level,
        nitrogen=telemetry.nitrogen,
        phosphorus=telemetry.phosphorus,
        potassium=telemetry.potassium,
        ambient_temperature=telemetry.ambient_temperature or w_data["temp"],
        ambient_humidity=telemetry.ambient_humidity or w_data["humidity"]
    )
    db.add(new_telemetry)
    db.commit()
    db.refresh(new_telemetry)
    
    # 4. Trigger Machine Learning Inference
    # Retrieve weather forecast probability for next 24h
    rain_prob = max((item["rain_probability"] for item in w_data.get("hourly", [])[:24]), default=0.0)
    
    ml_output = predict.predict_irrigation(
        crop_name=crop.name,
        soil_moisture=telemetry.soil_moisture,
        temperature=telemetry.soil_temperature or w_data["temp"],
        humidity=telemetry.ambient_humidity or w_data["humidity"],
        wind_speed=w_data["wind_speed"],
        rainfall_prob=rain_prob
    )
    ml_output = predict.adjust_irrigation_for_weather(ml_output, w_data)
    
    # Calculate best watering time:
    # If high temperature during midday, watering is recommended in evening/night or early morning
    best_time = datetime.now(timezone.utc)
    if ml_output["weather_adjustment"]["recommended_window"] == "early morning or evening":
        # Schedule for night (e.g. + 6 hours) or early morning
        best_time = datetime.now(timezone.utc) + timedelta(hours=6)
        
    # 5. Save recommendation
    new_recommendation = models.IrrigationRecommendation(
        crop_id=crop.id,
        recommended_water_volume_liters=ml_output["recommended_water_volume_liters"],
        is_irrigation_required=ml_output["is_irrigation_required"],
        best_irrigation_time=best_time,
        risk_level=ml_output["risk_level"],
        status="pending",
        model_type=ml_output["model_type"],
        confidence_score=ml_output["confidence_score"],
        features_snapshot={
            "soil_moisture": telemetry.soil_moisture,
            "temperature": telemetry.soil_temperature or w_data["temp"],
            "ambient_humidity": telemetry.ambient_humidity or w_data["humidity"],
            "wind_speed": w_data["wind_speed"],
            "rainfall_prob": rain_prob
            ,"weather_adjustment": ml_output["weather_adjustment"]
        }
    )
    db.add(new_recommendation)
    
    # 6. Generate Notification Logs if risk is Medium/High or irrigation required
    if ml_output["risk_level"] in ["medium", "high"] or ml_output["is_irrigation_required"]:
        category = "alert" if ml_output["risk_level"] == "high" else "recommendation"
        title = "High Water Deficit Alert" if ml_output["risk_level"] == "high" else "Irrigation Recommended"
        message = f"Crop {crop.name} in field {crop.field.name} has critical moisture levels ({telemetry.soil_moisture}%). Recommended water: {ml_output['recommended_water_volume_liters']} L."
        
        new_notification = models.NotificationLog(
            farm_id=farm.id,
            title=title,
            message=message,
            category=category,
            is_read=False
        )
        db.add(new_notification)
        
    db.commit()
    db.refresh(new_recommendation)
    return new_recommendation

# ------------------------------------------------------------------------------
# Weather Endpoints
# ------------------------------------------------------------------------------
@router.get("/weather", response_model=schemas.WeatherSummaryResponse)
async def get_weather(
    farm_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if farm_id:
        farm = db.query(models.Farm).filter(models.Farm.id == farm_id, models.Farm.user_id == current_user.id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found or access denied")
        lat, lon = farm.location_latitude, farm.location_longitude
    elif latitude is not None and longitude is not None:
        lat, lon = latitude, longitude
    else:
        raise HTTPException(
            status_code=400,
            detail="Either farm_id or both latitude and longitude must be provided"
        )
        
    w_data = await weather.fetch_weather_data(lat, lon)
    return w_data

@router.get("/weather/health")
async def get_weather_health(current_user: models.User = Depends(get_current_user)):
    return await weather.weather_health_check()

# ------------------------------------------------------------------------------
# Recommendation Endpoints
# ------------------------------------------------------------------------------
@router.get("/recommendations", response_model=List[schemas.RecommendationResponse])
def get_recommendations(crop_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify crop ownership
    crop = db.query(models.Crop).join(models.Field).join(models.Farm).filter(
        models.Crop.id == crop_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found or access denied")
        
    return db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id == crop_id
    ).order_by(models.IrrigationRecommendation.timestamp.desc()).all()

@router.put("/recommendations/{rec_id}", response_model=schemas.RecommendationResponse)
def update_recommendation_status(
    rec_id: str,
    applied_volume: float = Query(..., ge=0, le=10_000_000),
    status: Literal["pending", "applied", "skipped", "deferred"] = "applied",
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = db.query(models.IrrigationRecommendation).join(models.Crop).join(models.Field).join(models.Farm).filter(
        models.IrrigationRecommendation.id == rec_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found or access denied")
        
    rec.status = status
    rec.applied_water_volume_liters = applied_volume
    db.commit()
    db.refresh(rec)
    return rec

# ------------------------------------------------------------------------------
# Sarvam AI Regional Speech Endpoint
# ------------------------------------------------------------------------------
@router.get("/recommendations/{rec_id}/audio")
async def get_recommendation_voice(rec_id: str, target_lang: str = "hi-IN", current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(models.IrrigationRecommendation).join(models.Crop).join(models.Field).join(models.Farm).filter(
        models.IrrigationRecommendation.id == rec_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
        
    # Generate English text description
    crop_name = rec.crop.name
    action = "Irrigation is required." if rec.is_irrigation_required else "Irrigation is not required."
    details = f"Recommended water volume is {rec.recommended_water_volume_liters} liters." if rec.is_irrigation_required else "Soil moisture is optimal."
    risk = f"Risk level is {rec.risk_level}."
    
    full_text_en = f"Recommendation for {crop_name}. {action} {details} {risk}"
    
    # Translate
    translated_text = await sarvam_ai.translate_text(full_text_en, "en-IN", target_lang)
    
    # TTS
    audio_base64 = await sarvam_ai.text_to_speech_sarvam(translated_text, target_lang)
    
    return {
        "text_english": full_text_en,
        "text_translated": translated_text,
        "audio_base64": audio_base64, # None if key is missing (triggers browser TTS fallback)
        "language": target_lang
    }

# ------------------------------------------------------------------------------
# Notification Endpoints
# ------------------------------------------------------------------------------
@router.get("/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(farm_id: Optional[str] = None, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if farm_id:
        farm = db.query(models.Farm).filter(models.Farm.id == farm_id, models.Farm.user_id == current_user.id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found or access denied")
        return db.query(models.NotificationLog).filter(
            models.NotificationLog.farm_id == farm_id
        ).order_by(models.NotificationLog.created_at.desc()).all()
    else:
        return db.query(models.NotificationLog).join(models.Farm).filter(
            models.Farm.user_id == current_user.id
        ).order_by(models.NotificationLog.created_at.desc()).all()

@router.put("/notifications/read")
def mark_all_notifications_read(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(models.NotificationLog).join(models.Farm).filter(
        models.Farm.user_id == current_user.id,
        models.NotificationLog.is_read == False
    ).all()
    for notif in notifs:
        notif.is_read = True
    db.commit()
    return {"status": "success", "count": len(notifs)}

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


# ------------------------------------------------------------------------------
# Admin Dependencies & Endpoints
# ------------------------------------------------------------------------------
def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    print(f"DEBUG: get_current_admin checking user={current_user.email}, role={current_user.role}")
    if current_user.role not in ["ADMIN", "SUPER_ADMIN", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied. Administrator privileges required. Your role: {current_user.role}"
        )
    return current_user

@router.get("/admin/stats", response_model=schemas.AdminStats)
def get_admin_stats(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    total_farms = db.query(models.Farm).count()
    total_fields = db.query(models.Field).count()
    total_sensors = db.query(models.Sensor).count()
    sensors_active = db.query(models.Sensor).filter(models.Sensor.status == "active").count()
    sensors_inactive = total_sensors - sensors_active
    active_crops = db.query(models.Crop).filter(models.Crop.status == "growing").count()
    
    # Calculate recommended vs applied water volume
    recs = db.query(
        models.IrrigationRecommendation.recommended_water_volume_liters,
        models.IrrigationRecommendation.applied_water_volume_liters,
        models.IrrigationRecommendation.confidence_score
    ).all()
    
    total_rec = sum(r[0] for r in recs)
    total_app = sum(r[1] for r in recs)
    avg_conf = (sum(r[2] for r in recs) / len(recs)) if recs else 1.0

    return {
        "total_users": total_users,
        "total_farms": total_farms,
        "total_fields": total_fields,
        "total_sensors": total_sensors,
        "sensors_active": sensors_active,
        "sensors_inactive": sensors_inactive,
        "active_crops": active_crops,
        "total_water_recommended_liters": round(total_rec, 2),
        "total_water_applied_liters": round(total_app, 2),
        "average_confidence": round(avg_conf, 3)
    }

@router.get("/admin/users", response_model=List[schemas.UserResponse])
def get_admin_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_admin: models.User = Depends(require_super_admin), # Restrict to SUPER_ADMIN
    db: Session = Depends(get_db)
):
    query = db.query(models.User)
    if search:
        query = query.filter(
            (models.User.email.ilike(f"%{search}%")) | 
            (models.User.full_name.ilike(f"%{search}%"))
        )
    if role:
        query = query.filter(models.User.role == role)
    return query.order_by(models.User.created_at.desc()).all()

@router.put("/admin/users/{user_id}/status", response_model=schemas.UserResponse)
def update_user_status(
    user_id: str,
    update_data: schemas.AdminUserUpdate,
    current_admin: models.User = Depends(require_super_admin), # Restrict to SUPER_ADMIN
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 1. Never allow self modifications
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot alter your own administrative status")
        
    # 2. Never allow modifying SUPER_ADMIN role/status
    if user.role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Super Admin role/status cannot be modified.")
        
    # 3. Never allow promoting someone to SUPER_ADMIN
    if update_data.role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Cannot promote a user to SUPER_ADMIN.")
        
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: str,
    current_admin: models.User = Depends(require_super_admin), # Restrict to SUPER_ADMIN
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent deleting SUPER_ADMIN
    if user.role == "SUPER_ADMIN" or user.email == "sunkaraajay66@gmail.com":
        raise HTTPException(status_code=400, detail="Super Admin account cannot be deleted.")
        
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
        
    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}

# ------------------------------------------------------------------------------
# Super Admin Approval requests Endpoints
# ------------------------------------------------------------------------------
@router.get("/admin/requests", response_model=List[schemas.UserResponse])
def get_pending_admin_requests(
    current_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    return db.query(models.User).filter(
        models.User.role == "ADMIN_PENDING",
        models.User.status == "PENDING"
    ).order_by(models.User.created_at.desc()).all()

@router.post("/admin/requests/{user_id}/approve", response_model=schemas.UserResponse)
def approve_admin_request(
    user_id: str,
    approval_data: schemas.AdminRequestApproval,
    current_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "ADMIN_PENDING"
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pending admin request not found")
        
    user.role = "ADMIN"
    user.status = "ACTIVE"
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user

@router.post("/admin/requests/{user_id}/reject", response_model=schemas.UserResponse)
def reject_admin_request(
    user_id: str,
    rejection_data: schemas.AdminRequestRejection,
    current_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "ADMIN_PENDING"
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pending admin request not found")
        
    user.status = "REJECTED"
    # role remains ADMIN_PENDING
    user.is_active = False
    # we can store rejection reason in logs or profile if desired, but user model doesn't have it.
    # We can write it to log if needed.
    db.commit()
    db.refresh(user)
    return user

@router.get("/admin/farms", response_model=List[schemas.FarmResponse])
def get_admin_farms(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.Farm).order_by(models.Farm.created_at.desc()).all()

@router.get("/admin/fields", response_model=List[schemas.FieldResponse])
def get_admin_fields(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.Field).order_by(models.Field.created_at.desc()).all()

@router.get("/admin/sensors", response_model=List[schemas.SensorResponse])
def get_admin_sensors(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.Sensor).order_by(models.Sensor.created_at.desc()).all()

@router.get("/admin/predictions", response_model=List[schemas.RecommendationResponse])
def get_admin_predictions(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.IrrigationRecommendation).order_by(models.IrrigationRecommendation.timestamp.desc()).limit(100).all()

@router.get("/admin/weather")
def get_admin_weather(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    records = db.query(models.WeatherRecord).order_by(models.WeatherRecord.timestamp.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "farm_id": r.farm_id,
            "farm_name": r.farm.name,
            "timestamp": r.timestamp,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "precipitation_probability": r.precipitation_probability,
            "wind_speed": r.wind_speed,
            "conditions": r.conditions
        }
        for r in records
    ]

@router.post("/admin/notifications/broadcast")
def broadcast_notification(
    broadcast: schemas.AdminBroadcastNotification,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    farms = db.query(models.Farm).all()
    logs = []
    for farm in farms:
        log = models.NotificationLog(
            farm_id=farm.id,
            title=broadcast.title,
            message=broadcast.message,
            category=broadcast.category,
            is_read=False
        )
        db.add(log)
        logs.append(log)
    db.commit()
    return {"status": "success", "broadcast_count": len(logs)}

@router.get("/admin/reports/summary", response_model=List[schemas.AdminReportItem])
def get_admin_reports(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(
        models.Crop.name.label("crop_name"),
        func.sum(models.IrrigationRecommendation.recommended_water_volume_liters).label("recommended_volume"),
        func.sum(models.IrrigationRecommendation.applied_water_volume_liters).label("applied_volume"),
        func.avg(models.IrrigationRecommendation.confidence_score).label("avg_confidence"),
        func.count(models.IrrigationRecommendation.id).label("recommendations_count")
    ).join(
        models.IrrigationRecommendation, models.Crop.id == models.IrrigationRecommendation.crop_id
    ).group_by(models.Crop.name).all()
    
    return [
        {
            "crop_name": r.crop_name,
            "recommended_volume": round(float(r.recommended_volume or 0.0), 2),
            "applied_volume": round(float(r.applied_volume or 0.0), 2),
            "avg_confidence": round(float(r.avg_confidence or 1.0), 3),
            "recommendations_count": r.recommendations_count
        }
        for r in results
    ]


# ------------------------------------------------------------------------------
# ML Predict & Comparison Endpoints
# ------------------------------------------------------------------------------
@router.post("/api/ml/predict", response_model=schemas.MLPredictResponse)
async def get_ml_prediction(payload: schemas.MLPredictRequest, db: Session = Depends(get_db)):
    """
    Predicts the irrigation water requirement based on weather, soil, and crop characteristics.
    Allows passing a specific model to test different architectures.
    Provides scheduling recommendation (when to irrigate).
    """
    try:
        # Support both 'crop' and 'crop_type'
        crop_name = payload.crop or payload.crop_type
        if not crop_name:
            raise HTTPException(status_code=400, detail="Either 'crop' or 'crop_type' must be provided.")
            
        # Support alternative fields temperature/temperature_c and rainfall/rainfall_mm
        temperature_val = payload.temperature if payload.temperature is not None else payload.temperature_c
        rainfall_val = payload.rainfall if payload.rainfall is not None else payload.rainfall_mm
        
        if temperature_val is None:
            temperature_val = 30.0  # safe default
        if rainfall_val is None:
            rainfall_val = 0.0  # safe default

        # Land area conversion (Authoritative conversion between acres and hectares)
        acres_val = payload.field_area_acres
        hectares_val = payload.field_area_hectare
        
        if acres_val is not None:
            if hectares_val is None:
                hectares_val = acres_val * 0.40468564224
        elif hectares_val is not None:
            acres_val = hectares_val / 0.40468564224
        else:
            # Defaults if not provided
            acres_val = 1.0
            hectares_val = 0.40468564224

        # Map other optional fields passed in payload to kwargs for ML model
        extra_kwargs = {}
        # List of fields that map directly to feature columns
        ml_fields = [
            "crop_growth_stage", "soil_ph", "organic_carbon", "electrical_conductivity",
            "N", "P", "K", "sunlight_hours", "wind_speed_kmh", "season", "irrigation_type",
            "water_source", "mulching_used", "previous_irrigation_mm", "region", "ET_index"
        ]
        
        for field_name in ml_fields:
            val = getattr(payload, field_name, None)
            if val is not None:
                extra_kwargs[field_name] = val
                
        # Set field_area_hectare as it is part of ML feature columns
        extra_kwargs["field_area_hectare"] = hectares_val

        # Run ML model water requirements prediction (How much water in mm)
        prediction = predict_water_requirement(
            temperature=temperature_val,
            humidity=payload.humidity,
            rainfall=rainfall_val,
            soil_moisture=payload.soil_moisture,
            crop=crop_name,
            soil_type=payload.soil_type,
            model=payload.model,
            **extra_kwargs
        )
        
        # authoritative total water required liters calculation
        # total_water_litres = water_required_mm * 4046.8564224 * field_area_acres
        water_required_mm = prediction["water_required"]
        total_water_litres = int(round(water_required_mm * 4046.8564224 * acres_val))

        # Run Irrigation Scheduling Service (When to irrigate)
        sched = await scheduling.generate_irrigation_schedule(
            water_required_mm=water_required_mm,
            soil_moisture=payload.soil_moisture,
            crop_type=crop_name,
            crop_growth_stage=payload.crop_growth_stage,
            ET_index=payload.ET_index,
            previous_irrigation_mm=payload.previous_irrigation_mm,
            temperature_c=temperature_val,
            humidity=payload.humidity,
            latitude=payload.latitude,
            longitude=payload.longitude,
            field_id=payload.field_id,
            soil_type=payload.soil_type,
            db=db
        )

        return {
            # Backward-compatible fields
            "water_required": water_required_mm,
            "recommendation": prediction["recommendation"],
            "confidence": prediction["confidence"],
            "model_type": prediction["model_type"],
            "prediction_time_ms": prediction["prediction_time_ms"],
            "display_name": prediction["display_name"],
            
            # Extended response fields
            "model": prediction["model_type"],
            "prediction": {
                "water_required_mm": water_required_mm
            },
            "field": {
                "area_acres": round(acres_val, 2),
                "total_water_litres": total_water_litres
            },
            "irrigation_schedule": sched
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/ml/train", response_model=schemas.MLTrainResponse)
def run_ml_training(
    payload: schemas.MLTrainRequest,
    background_tasks: BackgroundTasks,
    current_admin: models.User = Depends(get_current_admin)
):
    """
    Starts the background machine learning training and comparison process.
    Restricted to Admins and Super Admins.
    """
    try:
        from ml.train import train_and_compare
        
        # Read parameters
        weights = payload.weights
        dataset_path = "datasets/irrigation_master_dataset_v1.csv"
        
        # Trigger training in background
        background_tasks.add_task(train_and_compare, dataset_path, weights)
        
        return {
            "status": "training",
            "message": "Multi-model training and benchmarking pipeline started in the background.",
            "best_model": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")

@router.get("/api/ml/training-status", response_model=schemas.MLTrainingStatusResponse)
def get_ml_training_status(
    current_admin: models.User = Depends(get_current_admin)
):
    """
    Retrieves the current training state, logs, progress, and evaluation results.
    Restricted to Admins and Super Admins.
    """
    status_file = os.path.join(os.path.dirname(__file__), "../../ml/models/training_status.json")
    if os.path.exists(status_file):
        try:
            with open(status_file, "r") as f:
                data = json.load(f)
                return {
                    "status": data.get("status", "idle"),
                    "current_model": data.get("current_model", ""),
                    "progress": data.get("progress", 0),
                    "logs": data.get("logs", []),
                    "error": data.get("error"),
                    "results": data.get("results", [])
                }
        except Exception as e:
            return {
                "status": "failed",
                "current_model": "",
                "progress": 0,
                "logs": [f"Error reading status file: {e}"],
                "error": str(e),
                "results": []
            }
            
    # Default return when training has never run
    return {
        "status": "idle",
        "current_model": "",
        "progress": 0,
        "logs": ["No active training run has been initiated."],
        "error": None,
        "results": []
    }

@router.post("/api/ml/set-production-model", response_model=schemas.MLSetProductionModelResponse)
def set_production_model(
    payload: schemas.MLSetProductionModelRequest,
    current_admin: models.User = Depends(get_current_admin)
):
    """
    Sets the default production model for crop telemetry predictions.
    Restricted to Admins and Super Admins.
    """
    model_name = payload.model.lower().replace(" ", "_")
    valid_models = ["random_forest", "gradient_boosting", "xgboost", "lstm"]
    if model_name not in valid_models:
        raise HTTPException(status_code=400, detail=f"Invalid model name. Must be one of: {valid_models}")
        
    models_dir = os.path.join(os.path.dirname(__file__), "../../ml/models")
    
    # Verify the selected model is actually trained and exists
    model_path = None
    if model_name == "random_forest":
        model_path = os.path.join(models_dir, "random_forest", "model.pkl")
    elif model_name == "gradient_boosting":
        model_path = os.path.join(models_dir, "gradient_boosting", "model.pkl")
    elif model_name == "xgboost":
        model_path = os.path.join(models_dir, "xgboost", "model.pkl")
    elif model_name == "lstm":
        model_path = os.path.join(models_dir, "lstm", "model.keras")
        
    if model_path and not os.path.exists(model_path):
        raise HTTPException(
            status_code=422, 
            detail=f"Model '{payload.model}' has not been successfully trained yet. Please run training first."
        )
        
    config_path = os.path.join(models_dir, "../production_model.json")
    try:
        # Save to top level ml/production_model.json
        with open(config_path, "w") as f:
            json.dump({"model": model_name, "production_model": model_name}, f, indent=4)
        # Save copy to ml/models/production_model.json
        with open(os.path.join(models_dir, "production_model.json"), "w") as f:
            json.dump({"model": model_name, "production_model": model_name}, f, indent=4)
            
        # Copy the selected production model to default model paths for compatibility
        import shutil
        import pickle
        # Root fallback model path
        root_dest = os.path.join(models_dir, "irrigation_model.pkl")
        if model_name != "lstm":
            shutil.copy2(model_path, root_dest)
            # Also copy to rf_regressor.pkl, rf_classifier.pkl etc. to keep main.py happy
            for fname in ["rf_regressor.pkl", "rf_classifier.pkl", "rf_risk_classifier.pkl"]:
                shutil.copy2(model_path, os.path.join(models_dir, fname))
                
        return {
            "status": "success",
            "production_model": model_name,
            "message": f"Successfully set '{payload.model}' as the active production model."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set production model: {str(e)}")

@router.get("/api/ml/comparison-results", response_model=Dict[str, Any])
def get_ml_comparison_results(
    current_admin: models.User = Depends(get_current_admin)
):
    """
    Retrieves the metrics and scoring of all trained models for dashboard visualization.
    Restricted to Admins and Super Admins.
    """
    results_path = os.path.join(os.path.dirname(__file__), "../../ml/model_comparison.json")
    if os.path.exists(results_path):
        try:
            with open(results_path, "r") as f:
                data = json.load(f)
                
            # Add production model key
            prod_model = "xgboost"
            prod_path = os.path.join(os.path.dirname(__file__), "../../ml/production_model.json")
            if os.path.exists(prod_path):
                with open(prod_path, "r") as pf:
                    prod_model = json.load(pf).get("model", json.load(pf).get("production_model", "xgboost"))
            
            # Map new model_comparison.json format to legacy format for frontend page.tsx
            legacy_results = []
            models_dict = data.get("results", data.get("models", {}))
            
            # Random Forest
            rf_data = models_dict.get("random_forest", {})
            if rf_data and rf_data.get("status") != "not_applicable":
                legacy_results.append({
                    "name": "Random Forest",
                    "r2": rf_data.get("r2"),
                    "mae": rf_data.get("mae"),
                    "rmse": rf_data.get("rmse"),
                    "mse": rf_data.get("rmse", 0) ** 2 if rf_data.get("rmse") else 0.0,
                    "training_time": rf_data.get("training_time_seconds"),
                    "prediction_time_ms": rf_data.get("prediction_time_ms"),
                    "model_size_kb": rf_data.get("model_size_kb"),
                    "status": "success",
                    "explanation": "Random Forest Regressor trained successfully."
                })
                
            # Gradient Boosting
            gb_data = models_dict.get("gradient_boosting", {})
            if gb_data and gb_data.get("status") != "not_applicable":
                legacy_results.append({
                    "name": "Gradient Boosting",
                    "r2": gb_data.get("r2"),
                    "mae": gb_data.get("mae"),
                    "rmse": gb_data.get("rmse"),
                    "mse": gb_data.get("rmse", 0) ** 2 if gb_data.get("rmse") else 0.0,
                    "training_time": gb_data.get("training_time_seconds"),
                    "prediction_time_ms": gb_data.get("prediction_time_ms"),
                    "model_size_kb": gb_data.get("model_size_kb"),
                    "status": "success",
                    "explanation": "Gradient Boosting Regressor trained successfully."
                })
                
            # XGBoost
            xgb_data = models_dict.get("xgboost", {})
            if xgb_data and xgb_data.get("status") != "not_applicable":
                legacy_results.append({
                    "name": "XGBoost",
                    "r2": xgb_data.get("r2"),
                    "mae": xgb_data.get("mae"),
                    "rmse": xgb_data.get("rmse"),
                    "mse": xgb_data.get("rmse", 0) ** 2 if xgb_data.get("rmse") else 0.0,
                    "training_time": xgb_data.get("training_time_seconds"),
                    "prediction_time_ms": xgb_data.get("prediction_time_ms"),
                    "model_size_kb": xgb_data.get("model_size_kb"),
                    "status": "success",
                    "explanation": "XGBoost Regressor trained successfully."
                })
                
            # LSTM
            lstm_data = models_dict.get("lstm", {})
            if lstm_data and "r2" in lstm_data and lstm_data.get("status") != "not_applicable":
                legacy_results.append({
                    "name": "LSTM",
                    "r2": lstm_data.get("r2"),
                    "mae": lstm_data.get("mae"),
                    "rmse": lstm_data.get("rmse"),
                    "mse": lstm_data.get("rmse", 0) ** 2 if lstm_data.get("rmse") else 0.0,
                    "training_time": lstm_data.get("training_time_seconds"),
                    "prediction_time_ms": lstm_data.get("prediction_time_ms"),
                    "model_size_kb": lstm_data.get("model_size_kb"),
                    "status": "success",
                    "explanation": "LSTM trained successfully with sequential sequence windowing."
                })
            else:
                legacy_results.append({
                    "name": "LSTM",
                    "r2": None,
                    "mae": None,
                    "rmse": None,
                    "mse": None,
                    "training_time": None,
                    "prediction_time_ms": None,
                    "model_size_kb": lstm_data.get("model_size_kb", 0),
                    "status": "not_applicable",
                    "explanation": lstm_data.get("reason", "LSTM not applicable — insufficient temporal data.")
                })
            
            # Identify best accuracy model (highest R2)
            active_models = [r for r in legacy_results if r["status"] == "success"]
            best_acc_model = "xgboost"
            if active_models:
                best_acc_model = max(active_models, key=lambda x: x["r2"])["name"].lower().replace(" ", "_")
                
            transformed_data = {
                "dataset_shape": data.get("dataset_shape", [data.get("dataset", {}).get("rows", 0), data.get("dataset", {}).get("columns", 0)]),
                "results": legacy_results,
                "best_model": best_acc_model,
                "production_model": prod_model
            }
            return transformed_data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading comparison results: {e}")
            
    raise HTTPException(status_code=404, detail="No comparison results found. Please train models first.")


@router.get("/api/ml/model-comparison", response_model=Dict[str, Any])
def get_ml_model_comparison(
    current_admin: models.User = Depends(get_current_admin)
):
    """
    Retrieves the ML models benchmark metrics, winners, and overall comparison scoring.
    Restricted to Admins and Super Admins.
    """
    results_path = os.path.join(os.path.dirname(__file__), "../../ml/model_comparison.json")
    if not os.path.exists(results_path):
        raise HTTPException(status_code=404, detail="No comparison results found. Please train models first.")
        
    try:
        with open(results_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # Map models dict to models list
        models_list = []
        for name_key, m in data.get("results", {}).items():
            if m.get("status") == "evaluated":
                models_list.append({
                    "name": m.get("name"),
                    "r2": m.get("r2"),
                    "mae": m.get("mae"),
                    "rmse": m.get("rmse"),
                    "training_time_seconds": m.get("training_time_seconds"),
                    "prediction_time_ms": m.get("prediction_time_ms"),
                    "model_size_kb": m.get("model_size_kb"),
                    "status": "evaluated"
                })
            else:
                models_list.append({
                    "name": m.get("name"),
                    "r2": None,
                    "mae": None,
                    "rmse": None,
                    "training_time_seconds": None,
                    "prediction_time_ms": None,
                    "model_size_kb": None,
                    "status": "not_applicable",
                    "reason": m.get("reason", "Insufficient chronological/time-series data")
                })
                
        response_data = {
            "models": models_list,
            "best_predictive_model": data.get("best_predictive_model"),
            "fastest_model": data.get("fastest_model"),
            "lowest_error_model": data.get("lowest_error_model"),
            "best_overall_model": data.get("best_overall_model"),
            "manual_production_selection": True
        }
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading comparison results: {str(e)}")


