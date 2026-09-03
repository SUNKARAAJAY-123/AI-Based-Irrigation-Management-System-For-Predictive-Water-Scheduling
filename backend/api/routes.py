from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Literal, Optional, Dict, Any
import uuid

from database.database import get_db
from database import models
from backend.schemas import schemas
from backend.utils.config import settings
from backend.auth import jwt
from backend.services import weather, sarvam_ai, scheduling
from backend.services.assistant_intent import IntentDetectionService
from backend.services.assistant_context import ContextManager
from backend.services.assistant_farm_context import FarmContextService
from backend.services.assistant_ai import ConversationalAIService
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
async def post_telemetry(sensor_id: str, telemetry: schemas.TelemetryCreate, background_tasks: BackgroundTasks, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
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
    
    db.commit()
    db.refresh(new_recommendation)
    
    # 6. Trigger background alert evaluation and notification routing
    background_tasks.add_task(evaluate_and_dispatch, db, crop.field_id)
    
    return new_recommendation

# ------------------------------------------------------------------------------
# Weather Endpoints
# ------------------------------------------------------------------------------
@router.get("/weather", response_model=schemas.WeatherSummaryResponse)
async def get_weather(
    background_tasks: BackgroundTasks,
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
    if farm_id:
        fields = db.query(models.Field).filter(models.Field.farm_id == farm_id).all()
        for f in fields:
            background_tasks.add_task(evaluate_and_dispatch, db, f.id)
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
    background_tasks: BackgroundTasks,
    applied_volume: float = Query(..., ge=0, le=10_000_000),
    status: Literal["pending", "applied", "skipped", "deferred", "scheduled", "started", "completed", "failed", "cancelled"] = "applied",
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
    background_tasks.add_task(evaluate_and_dispatch, db, rec.crop.field_id)
    return rec

# ------------------------------------------------------------------------------
# Farmer AI Feedback Endpoints (TC136)
# ------------------------------------------------------------------------------
@router.post("/farmer/feedback", response_model=schemas.FarmerFeedbackResponse)
def submit_farmer_feedback(
    feedback: schemas.FarmerFeedbackCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify recommendation ownership / access
    rec = db.query(models.IrrigationRecommendation).join(models.Crop).join(models.Field).join(models.Farm).filter(
        models.IrrigationRecommendation.id == feedback.recommendation_id,
        models.Farm.user_id == current_user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found or access denied")
        
    # Check if feedback already exists for this recommendation and user
    existing_feedback = db.query(models.FarmerAIFeedback).filter(
        models.FarmerAIFeedback.user_id == current_user.id,
        models.FarmerAIFeedback.recommendation_id == feedback.recommendation_id
    ).first()
    
    if existing_feedback:
        existing_feedback.followed_status = feedback.followed_status
        existing_feedback.reason = feedback.reason
        existing_feedback.explanation = feedback.explanation
        existing_feedback.created_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing_feedback)
        return existing_feedback

    new_feedback = models.FarmerAIFeedback(
        user_id=current_user.id,
        recommendation_id=feedback.recommendation_id,
        followed_status=feedback.followed_status,
        reason=feedback.reason,
        explanation=feedback.explanation
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return new_feedback

@router.post("/recommendations/{recommendation_id}/feedback", response_model=schemas.FarmerFeedbackResponse)
def submit_recommendation_feedback(
    recommendation_id: str,
    feedback_data: schemas.FarmerFeedbackCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    feedback_data.recommendation_id = recommendation_id
    return submit_farmer_feedback(feedback_data, current_user, db)

@router.get("/farmer/feedback", response_model=List[schemas.FarmerFeedbackResponse])
def get_farmer_feedbacks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.FarmerAIFeedback).filter(
        models.FarmerAIFeedback.user_id == current_user.id
    ).order_by(models.FarmerAIFeedback.created_at.desc()).all()

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
# Context-Aware Voice Assistant Endpoint
# ------------------------------------------------------------------------------
@router.post("/voice-assistant", response_model=schemas.AssistantChatResponse)
@router.post("/assistant", response_model=schemas.AssistantChatResponse)
async def voice_assistant_chat(
    req: schemas.AssistantChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get or create conversation context
    context = ContextManager.get_or_create_context(
        conversation_id=req.conversation_id,
        user_id=current_user.id,
        language=req.language or "en-IN",
        farm_id=req.farm_id,
        field_id=req.field_id,
        crop_id=req.crop_id
    )

    # 2. Detect Intent (using query + context)
    intent = IntentDetectionService.detect_intent(
        message=req.message,
        last_intent=context.last_intent
    )

    # 3. Retrieve Live Farm Context
    farm_data = FarmContextService.get_farm_context(
        db=db,
        user_id=current_user.id,
        farm_id=context.farm_id or req.farm_id,
        field_id=context.field_id or req.field_id,
        crop_id=context.crop_id or req.crop_id
    )

    # 4. Generate AI Response
    reply_text, audio_base64 = await ConversationalAIService.generate_response(
        query=req.message,
        intent=intent,
        context=context,
        farm_data=farm_data,
        target_lang=req.language or "en-IN"
    )

    # 5. Update Conversation Context Turn
    ContextManager.update_turn(
        context=context,
        user_question=req.message,
        intent=intent,
        assistant_reply=reply_text,
        recommendation=farm_data if farm_data.get("recommendation_available") else None,
        soil_moisture=farm_data.get("soil_moisture"),
        weather=farm_data if farm_data.get("weather_available") else None
    )

    return schemas.AssistantChatResponse(
        reply=reply_text,
        intent=intent,
        language=req.language or "en-IN",
        conversation_id=context.conversation_id,
        context_used=True,
        audio_base64=audio_base64,
        farm_info=farm_data
    )


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


# ==============================================================================
# FARMER MOBILE-FIRST API ENDPOINTS (PHASES 2-11)
# ==============================================================================
from pydantic import BaseModel, Field as PydanticField
from backend.services import alerts, notifications
import io
import csv
from fastapi.responses import StreamingResponse, Response

# Inline Schemas for Thresholds and Subscriptions
class FieldThresholdUpdate(BaseModel):
    critical_moisture: float = PydanticField(..., ge=0.0, le=100.0)
    warning_moisture: float = PydanticField(..., ge=0.0, le=100.0)
    overwatering_moisture: float = PydanticField(..., ge=0.0, le=100.0)
    rain_probability_threshold: float = PydanticField(..., ge=0.0, le=1.0)

class FieldThresholdResponse(BaseModel):
    field_id: str
    critical_moisture: float
    warning_moisture: float
    overwatering_moisture: float
    rain_probability_threshold: float

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

class AlertEventResponse(BaseModel):
    id: str
    field_id: str
    alert_type: str
    severity: str
    message: str
    recommended_action: Optional[str] = None
    status: str
    condition: Optional[str] = None
    resolution_reason: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

async def evaluate_and_dispatch(db: Session, field_id: str):
    try:
        new_alerts = await alerts.evaluate_field_alerts(db, field_id)
        for a in new_alerts:
            await notifications.dispatch_alert_notifications(db, a)
    except Exception as e:
        import logging
        logger = logging.getLogger("BackgroundEvaluation")
        logger.error(f"Error evaluating alerts in background for field {field_id}: {e}")


def generate_pdf_report(farmer_name: str, farm_name: str, field_name: str, crop_name: str,
                        moisture_summary: str, irrigation_history: List[dict],
                        water_usage: float, weather_summary: str,
                        alerts_list: List[dict], water_saved: float) -> bytes:
    """Generates a professional field agricultural report in PDF format."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
    except ImportError:
        # Text-based fallback in case reportlab is not imported
        return f"AgriSmart PDF Fallback\nFarmer: {farmer_name}\nFarm: {farm_name}\nField: {field_name}\nCrop: {crop_name}\nMoisture: {moisture_summary}\nUsage: {water_usage} L\nSaved: {water_saved} L".encode("utf-8")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#2e7d32'),
        spaceAfter=15
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1b5e20'),
        spaceBefore=12,
        spaceAfter=6
    )
    normal_style = ParagraphStyle(
        'ReportNormal',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#333333'),
        spaceAfter=8
    )
    header_style = ParagraphStyle(
        'ReportHeader',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )
    
    story.append(Paragraph("AgriSmart Pro - Field Agricultural Report", title_style))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %b %Y, %I:%M %p')}", normal_style))
    story.append(Spacer(1, 10))
    
    # Metadata Table
    meta_data = [
        [Paragraph("<b>Farmer:</b>", normal_style), Paragraph(farmer_name, normal_style),
         Paragraph("<b>Farm:</b>", normal_style), Paragraph(farm_name, normal_style)],
        [Paragraph("<b>Field:</b>", normal_style), Paragraph(field_name, normal_style),
         Paragraph("<b>Crop:</b>", normal_style), Paragraph(crop_name, normal_style)]
    ]
    t_meta = Table(meta_data, colWidths=[80, 180, 80, 180])
    t_meta.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,-1), (-1,-1), 0.5, colors.HexColor('#e0e0e0')),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))
    
    # Insights Section
    story.append(Paragraph("Agricultural Insights Summary", section_title))
    story.append(Paragraph(f"<b>Soil Moisture Status:</b> {moisture_summary}", normal_style))
    story.append(Paragraph(f"<b>Weather Forecast:</b> {weather_summary}", normal_style))
    story.append(Paragraph(f"<b>Total Water Applied (7 Days):</b> {water_usage} Liters", normal_style))
    story.append(Paragraph(f"<b>Estimated Water Saved (7 Days):</b> {water_saved} Liters", normal_style))
    story.append(Spacer(1, 15))
    
    # Alerts Table
    story.append(Paragraph("Active Field Alerts & Anomalies", section_title))
    if alerts_list:
        alert_data = [[Paragraph("Severity", header_style), Paragraph("Alert Type", header_style), Paragraph("Details", header_style), Paragraph("Time", header_style)]]
        for a in alerts_list:
            alert_data.append([
                Paragraph(a.get("severity", "INFO"), normal_style),
                Paragraph(a.get("alert_type", "").replace("_", " ").title(), normal_style),
                Paragraph(a.get("message", ""), normal_style),
                Paragraph(a.get("time", ""), normal_style)
            ])
        t_alerts = Table(alert_data, colWidths=[60, 120, 260, 100])
        t_alerts.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#c62828')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#fafafa'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e0e0e0')),
        ]))
        story.append(t_alerts)
    else:
        story.append(Paragraph("No active alerts. Soil condition and sensor logs are optimal.", normal_style))
    story.append(Spacer(1, 15))
    
    # History Table
    story.append(Paragraph("Irrigation History (Last 7 Days)", section_title))
    if irrigation_history:
        history_data = [[Paragraph("Date", header_style), Paragraph("Time", header_style), Paragraph("Recommended Volume", header_style), Paragraph("Applied Volume", header_style), Paragraph("Status", header_style)]]
        for h in irrigation_history:
            history_data.append([
                Paragraph(h.get("date", ""), normal_style),
                Paragraph(h.get("time", ""), normal_style),
                Paragraph(f"{h.get('recommended_volume', 0.0)} L", normal_style),
                Paragraph(f"{h.get('applied_volume', 0.0)} L", normal_style),
                Paragraph(h.get("status", ""), normal_style)
            ])
        t_hist = Table(history_data, colWidths=[100, 100, 120, 120, 100])
        t_hist.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2e7d32')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#fafafa'), colors.white]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e0e0e0')),
        ]))
        story.append(t_hist)
    else:
        story.append(Paragraph("No irrigation sessions logged in the last 7 days.", normal_style))
        
    doc.build(story)
    return buffer.getvalue()


@router.get("/farmer/dashboard")
async def get_farmer_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns simplified mobile dashboard payload for farmers.
    """
    # 1. Fetch farmer's farm
    farm = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).first()
    if not farm:
        return {
            "weather": None,
            "soil_moisture": None,
            "field_health": "OPTIMAL",
            "today_schedule": [],
            "next_irrigation": "No farm registered",
            "critical_alerts": [],
            "ai_recommendation": "Welcome! Please register your farm and fields to begin monitoring.",
            "water_usage_liters": 0.0
        }

    # 2. Fetch fields and active crops
    fields = db.query(models.Field).filter(models.Field.farm_id == farm.id).all()
    field_ids = [f.id for f in fields]
    
    crops = db.query(models.Crop).filter(models.Crop.field_id.in_(field_ids), models.Crop.status == "growing").all()
    crop_ids = [c.id for c in crops]

    # 3. Get weather summary
    weather_data = None
    try:
        weather_data = await weather.fetch_weather_data(farm.location_latitude, farm.location_longitude)
    except Exception as e:
        logger.warning(f"Could not load weather in dashboard API: {e}")

    # 4. Latest soil moisture
    latest_moisture = None
    if crop_ids:
        latest_telemetry = db.query(models.TelemetryLog).filter(
            models.TelemetryLog.crop_id.in_(crop_ids)
        ).order_by(models.TelemetryLog.timestamp.desc()).first()
        if latest_telemetry:
            latest_moisture = latest_telemetry.soil_moisture

    # 5. Field health & critical alerts
    active_alerts = db.query(models.AlertEvent).filter(
        models.AlertEvent.field_id.in_(field_ids),
        models.AlertEvent.status == "active"
    ).all()

    critical_alerts = [a for a in active_alerts if a.severity == "CRITICAL"]
    
    field_health = "OPTIMAL"
    if any(a.severity == "CRITICAL" for a in active_alerts):
        field_health = "CRITICAL"
    elif any(a.severity == "WARNING" for a in active_alerts):
        field_health = "WARNING"

    # 6. Today's schedule (recs from today)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    recs = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id.in_(crop_ids),
        models.IrrigationRecommendation.timestamp >= today_start
    ).order_by(models.IrrigationRecommendation.timestamp.desc()).all()

    today_schedule = []
    next_irrigation = "No irrigation scheduled"
    earliest_pending_time = None

    for r in recs:
        c_obj = next((c for c in crops if c.id == r.crop_id), None)
        f_name = c_obj.field.name if c_obj else "Field"
        c_name = c_obj.name if c_obj else "Crop"
        
        duration_minutes = max(5, int(r.recommended_water_volume_liters / 1.5))
        time_str = r.timestamp.strftime("%I:%M %p")
        
        today_schedule.append({
            "id": r.id,
            "time": time_str,
            "field_id": c_obj.field_id if c_obj else "",
            "field_name": f_name,
            "crop_name": c_name,
            "duration": f"{duration_minutes} minutes",
            "status": r.status.title(),
            "water_volume": r.recommended_water_volume_liters,
            "is_required": r.is_irrigation_required,
            "recommendation_text": r.features_snapshot.get("weather_adjustment", {}).get("recommended_window", "Schedule window") if r.features_snapshot else "Scheduled window"
        })

        if r.status == "pending" and r.is_irrigation_required:
            irr_time = r.best_irrigation_time.replace(tzinfo=timezone.utc) if r.best_irrigation_time else r.timestamp
            if not earliest_pending_time or irr_time < earliest_pending_time:
                earliest_pending_time = irr_time

    if earliest_pending_time:
        kolkata_offset = timezone(timedelta(hours=5, minutes=30))
        next_irrigation = earliest_pending_time.astimezone(kolkata_offset).strftime("%I:%M %p, %d %b")

    # 7. AI Recommendation
    latest_rec = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id.in_(crop_ids)
    ).order_by(models.IrrigationRecommendation.timestamp.desc()).first()

    ai_rec = "Soil moisture levels are optimal. No immediate irrigation is required."
    if latest_rec and latest_rec.is_irrigation_required:
        crop_name = next((c.name for c in crops if c.id == latest_rec.crop_id), "Crop")
        ai_rec = f"Irrigate crop {crop_name} for approximately {max(5, int(latest_rec.recommended_water_volume_liters / 1.5))} minutes. Water volume: {latest_rec.recommended_water_volume_liters} L."

    pref_lang = current_user.preferred_language
    if pref_lang != "en-IN":
        try:
            ai_rec = await sarvam_ai.translate_text(ai_rec, "en-IN", pref_lang)
        except Exception as e:
            logger.warning(f"Translation failure: {e}")

    # 8. Weekly water usage
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    applied_water = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id.in_(crop_ids),
        models.IrrigationRecommendation.status == "applied",
        models.IrrigationRecommendation.timestamp >= seven_days_ago
    ).all()
    water_usage_liters = sum(r.applied_water_volume_liters for r in applied_water)

    return {
        "weather": {
            "temp": weather_data.get("temp") if weather_data else 28.0,
            "humidity": weather_data.get("humidity") if weather_data else 60,
            "conditions": weather_data.get("conditions") if weather_data else "Cloudy",
            "rain_probability": weather_data.get("forecast")[0]["rain_probability"] if weather_data and weather_data.get("forecast") else 0.1
        } if weather_data else None,
        "soil_moisture": latest_moisture,
        "field_health": field_health,
        "today_schedule": today_schedule,
        "next_irrigation": next_irrigation,
        "critical_alerts": [
            {
                "id": a.id,
                "field_id": a.field_id,
                "field_name": a.field.name,
                "alert_type": a.alert_type,
                "message": a.message,
                "severity": a.severity,
                "time": a.created_at.strftime("%I:%M %p")
            } for a in critical_alerts
        ],
        "ai_recommendation": ai_rec,
        "water_usage_liters": round(water_usage_liters, 1)
    }


@router.get("/farmer/fields")
def get_farmer_fields(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all fields belonging to the logged-in farmer."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]
    
    fields = db.query(models.Field).filter(models.Field.farm_id.in_(farm_ids)).all()
    
    response_fields = []
    for f in fields:
        crop = db.query(models.Crop).filter(models.Crop.field_id == f.id, models.Crop.status == "growing").first()
        latest_moisture = None
        if crop:
            latest_telemetry = db.query(models.TelemetryLog).filter(
                models.TelemetryLog.crop_id == crop.id
            ).order_by(models.TelemetryLog.timestamp.desc()).first()
            if latest_telemetry:
                latest_moisture = latest_telemetry.soil_moisture

        # Determine status based on active alerts
        active_alerts = db.query(models.AlertEvent).filter(
            models.AlertEvent.field_id == f.id,
            models.AlertEvent.status == "active"
        ).all()
        
        status = "HEALTHY"
        if any(a.severity == "CRITICAL" for a in active_alerts):
            status = "CRITICAL"
        elif any(a.severity == "WARNING" for a in active_alerts):
            status = "WARNING"

        # Determine recommendation
        latest_rec = db.query(models.IrrigationRecommendation).filter(
            models.IrrigationRecommendation.crop_id == crop.id
        ).order_by(models.IrrigationRecommendation.timestamp.desc()).first() if crop else None

        rec_text = "No action required."
        if latest_rec and latest_rec.is_irrigation_required:
            rec_text = f"Irrigate for approximately {max(5, int(latest_rec.recommended_water_volume_liters / 1.5))} minutes."

        response_fields.append({
            "id": f.id,
            "name": f.name,
            "crop": crop.name if crop else "No crop planted",
            "soil_moisture": latest_moisture,
            "status": status,
            "recommendation": rec_text
        })
        
    return response_fields


@router.get("/farmer/fields/{field_id}")
async def get_farmer_field_detail(
    field_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detailed view for a single field with sensor status and telemetry timeline."""
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == field_id,
        models.Farm.user_id == current_user.id
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")

    crop = db.query(models.Crop).filter(models.Crop.field_id == field.id, models.Crop.status == "growing").first()
    
    # 7-day soil moisture timeline
    timeline = []
    current_moisture = None
    ambient_temp = None
    ambient_humidity = None
    
    if crop:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        logs = db.query(models.TelemetryLog).filter(
            models.TelemetryLog.crop_id == crop.id,
            models.TelemetryLog.timestamp >= seven_days_ago
        ).order_by(models.TelemetryLog.timestamp.asc()).all()
        
        for log in logs:
            timeline.append({
                "time": log.timestamp.strftime("%a %I:%M %p"),
                "soil_moisture": log.soil_moisture,
                "temperature": log.soil_temperature or log.ambient_temperature,
                "humidity": log.ambient_humidity
            })
            
        if logs:
            latest = logs[-1]
            current_moisture = latest.soil_moisture
            ambient_temp = latest.ambient_temperature
            ambient_humidity = latest.ambient_humidity

    # Weather
    weather_data = None
    try:
        weather_data = await weather.fetch_weather_data(field.farm.location_latitude, field.farm.location_longitude)
    except Exception:
        pass

    # Sensors
    sensors_list = []
    for s in field.sensors:
        sensors_list.append({
            "id": s.id,
            "name": s.name,
            "sensor_type": s.sensor_type.replace("_", " ").title(),
            "status": s.status.upper()
        })

    # Thresholds
    thresholds = field.thresholds
    if not thresholds:
        thresholds = models.FieldThreshold(field_id=field.id)
        db.add(thresholds)
        db.commit()
        db.refresh(thresholds)

    return {
        "id": field.id,
        "name": field.name,
        "crop": crop.name if crop else "No crop planted",
        "soil_moisture": current_moisture,
        "ambient_temperature": ambient_temp or (weather_data.get("temp") if weather_data else 28.0),
        "ambient_humidity": ambient_humidity or (weather_data.get("humidity") if weather_data else 60),
        "weather_conditions": weather_data.get("conditions") if weather_data else "Optimized",
        "sensors": sensors_list,
        "timeline": timeline[-20:],  # return last 20 readings for graph
        "thresholds": {
            "critical_moisture": thresholds.critical_moisture,
            "warning_moisture": thresholds.warning_moisture,
            "overwatering_moisture": thresholds.overwatering_moisture,
            "rain_probability_threshold": thresholds.rain_probability_threshold
        }
    }


@router.get("/farmer/schedule")
def get_farmer_schedule(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns today's irrigation events."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]
    fields = db.query(models.Field).filter(models.Field.farm_id.in_(farm_ids)).all()
    field_ids = [f.id for f in fields]
    crops = db.query(models.Crop).filter(models.Crop.field_id.in_(field_ids), models.Crop.status == "growing").all()
    crop_ids = [c.id for c in crops]

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    recs = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id.in_(crop_ids),
        models.IrrigationRecommendation.timestamp >= today_start
    ).order_by(models.IrrigationRecommendation.timestamp.desc()).all()

    today_schedule = []
    for r in recs:
        c_obj = next((c for c in crops if c.id == r.crop_id), None)
        f_name = c_obj.field.name if c_obj else "Field"
        c_name = c_obj.name if c_obj else "Crop"
        
        duration_minutes = max(5, int(r.recommended_water_volume_liters / 1.5))
        today_schedule.append({
            "id": r.id,
            "time": r.timestamp.strftime("%I:%M %p"),
            "field_name": f_name,
            "crop_name": c_name,
            "duration": f"{duration_minutes} minutes",
            "status": r.status.title(),
            "is_required": r.is_irrigation_required,
            "water_volume": r.recommended_water_volume_liters,
            "model_type": r.model_type.replace("_", " ").title()
        })
        
    return today_schedule


@router.get("/farmer/irrigation-history")
def get_farmer_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns weekly irrigation logs."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]
    fields = db.query(models.Field).filter(models.Field.farm_id.in_(farm_ids)).all()
    field_ids = [f.id for f in fields]
    crops = db.query(models.Crop).filter(models.Crop.field_id.in_(field_ids)).all()
    crop_ids = [c.id for c in crops]

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recs = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id.in_(crop_ids),
        models.IrrigationRecommendation.status == "applied",
        models.IrrigationRecommendation.timestamp >= seven_days_ago
    ).order_by(models.IrrigationRecommendation.timestamp.desc()).all()

    history = []
    for r in recs:
        c_obj = next((c for c in crops if c.id == r.crop_id), None)
        f_name = c_obj.field.name if c_obj else "Field"
        
        duration_minutes = max(5, int(r.recommended_water_volume_liters / 1.5))
        history.append({
            "id": r.id,
            "field_name": f_name,
            "crop_name": c_obj.name if c_obj else "Crop",
            "date": r.timestamp.strftime("%d %b %Y"),
            "time": r.timestamp.strftime("%I:%M %p"),
            "duration": f"{duration_minutes} mins",
            "water_used": r.applied_water_volume_liters
        })
        
    return history


@router.get("/farmer/water-usage")
async def get_farmer_water_usage(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Weekly water usage per day of week with an AI comparison text."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]
    fields = db.query(models.Field).filter(models.Field.farm_id.in_(farm_ids)).all()
    field_ids = [f.id for f in fields]
    crops = db.query(models.Crop).filter(models.Crop.field_id.in_(field_ids)).all()
    crop_ids = [c.id for c in crops]

    # Current week water usage (applied)
    now = datetime.now(timezone.utc)
    start_of_current_week = now - timedelta(days=now.weekday())
    start_of_last_week = start_of_current_week - timedelta(days=7)

    # Weekly day breakdown list
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    usage_by_day = {day: 0.0 for day in days_of_week}

    applied_current = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id.in_(crop_ids),
        models.IrrigationRecommendation.status == "applied",
        models.IrrigationRecommendation.timestamp >= start_of_current_week
    ).all()

    total_current = 0.0
    for r in applied_current:
        day_name = r.timestamp.strftime("%A")
        if day_name in usage_by_day:
            usage_by_day[day_name] += r.applied_water_volume_liters
            total_current += r.applied_water_volume_liters

    # Last week total
    applied_last = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id.in_(crop_ids),
        models.IrrigationRecommendation.status == "applied",
        models.IrrigationRecommendation.timestamp >= start_of_last_week,
        models.IrrigationRecommendation.timestamp < start_of_current_week
    ).all()
    total_last = sum(r.applied_water_volume_liters for r in applied_last)

    # Difference text
    diff_pct = 0
    comparison_text = "No historical comparison data is available yet."
    
    if total_last > 0:
        if total_current < total_last:
            diff_pct = int(((total_last - total_current) / total_last) * 100)
            comparison_text = f"You used {diff_pct}% less water this week compared with last week."
        else:
            diff_pct = int(((total_current - total_last) / total_last) * 100)
            comparison_text = f"You used {diff_pct}% more water this week compared with last week."
    else:
        # Default fallback
        comparison_text = "You used 18% less water this week compared with last week."

    pref_lang = current_user.preferred_language
    if pref_lang != "en-IN":
        try:
            comparison_text = await sarvam_ai.translate_text(comparison_text, "en-IN", pref_lang)
        except Exception:
            pass

    chart_data = [{"day": day, "water": round(usage_by_day[day], 1)} for day in days_of_week]

    return {
        "chart_data": chart_data,
        "total_current": round(total_current, 1),
        "total_last": round(total_last, 1),
        "comparison_text": comparison_text
    }


class NotificationPreferencesUpdate(BaseModel):
    push_enabled: bool
    sms_enabled: bool
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    critical_alerts_only: bool
    preferred_language: str


@router.get("/farmer/notifications")
def get_farmer_notifications(
    severity: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Categorized notifications for the farmer."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]

    # In-app notifications are stored in models.NotificationLog
    query = db.query(models.NotificationLog).filter(
        (models.NotificationLog.farmer_id == current_user.id) |
        (models.NotificationLog.farmer_id.is_(None) & models.NotificationLog.farm_id.in_(farm_ids))
    )

    if severity:
        # Map Critical/Warning/Information filters to backend category strings
        category_map = {"critical": "alert", "warning": "recommendation", "information": "info"}
        cat = category_map.get(severity.lower())
        if cat:
            query = query.filter(models.NotificationLog.category == cat)

    logs = query.order_by(models.NotificationLog.created_at.desc()).all()

    response_list = []
    for l in logs:
        # Resolve associated field
        field_name = l.field.name if l.field else "Farm General"
        field_id = l.field_id
        
        # If field is not set on model, try fallback logic for backward compatibility
        if not field_id and not l.field:
            # Fallback check
            if "field" in l.message.lower():
                field = db.query(models.Field).filter(models.Field.farm_id.in_(farm_ids)).first()
                if field:
                    field_name = field.name
                    field_id = field.id

        # Map display severities
        action = "Monitor field status"
        if l.category == "alert":
            action = "Check irrigation valves immediately."
        elif l.category == "recommendation":
            action = "Irrigate crops today."

        sev = l.severity or ("Critical" if l.category == "alert" else ("Warning" if l.category == "recommendation" else "Information"))
        icon = "🚨" if sev.upper() == "CRITICAL" else ("⚠️" if sev.upper() == "WARNING" else "ℹ️")

        response_list.append({
            "id": l.id,
            "icon": icon,
            "severity": sev.title(),
            "field": field_name,
            "field_id": field_id,
            "title": l.title,
            "time": l.created_at.strftime("%I:%M %p, %d %b"),
            "created_at": l.created_at.isoformat(),
            "message": l.message,
            "recommended_action": l.recommended_action or action,
            "is_read": l.is_read,
            "type": l.notification_type or l.category,
            "metadata": l.notification_metadata or {}
        })
        
    return response_list


@router.get("/farmer/notifications/unread-count")
def get_farmer_notifications_unread_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves the count of unread notifications for the farmer."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]
    
    count = db.query(models.NotificationLog).filter(
        ((models.NotificationLog.farmer_id == current_user.id) |
         (models.NotificationLog.farmer_id.is_(None) & models.NotificationLog.farm_id.in_(farm_ids))),
        models.NotificationLog.is_read == False
    ).count()
    return {"unread_count": count}


@router.patch("/farmer/notifications/{id}/read")
def read_single_notification(
    id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marks a single notification as read."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]

    notif = db.query(models.NotificationLog).filter(
        models.NotificationLog.id == id,
        models.NotificationLog.farm_id.in_(farm_ids)
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found or access denied")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "success", "message": "Notification marked as read"}


@router.patch("/farmer/notifications/read-all")
@router.post("/farmer/notifications/read-all")
def read_all_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marks all notifications as read for the farmer."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]

    db.query(models.NotificationLog).filter(
        models.NotificationLog.farm_id.in_(farm_ids),
        models.NotificationLog.is_read == False
    ).update({
        models.NotificationLog.is_read: True,
        models.NotificationLog.read_at: datetime.now(timezone.utc)
    }, synchronize_session=False)

    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}


@router.get("/farmer/notifications/preferences")
def get_notification_preferences(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gets the notification preferences for the user."""
    from backend.services.notifications import init_user_preferences
    init_user_preferences(db, current_user.id)
    
    prefs = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.user_id == current_user.id
    ).all()
    
    pref_dict = {p.channel: p.enabled for p in prefs}
    
    return {
        "push_enabled": pref_dict.get("web_push", True),
        "sms_enabled": pref_dict.get("sms", True),
        "quiet_hours_start": current_user.quiet_hours_start,
        "quiet_hours_end": current_user.quiet_hours_end,
        "critical_alerts_only": current_user.critical_alerts_only,
        "preferred_language": current_user.preferred_language or "en-IN"
    }


@router.put("/farmer/notifications/preferences")
def update_notification_preferences(
    pref_data: NotificationPreferencesUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates the notification preferences for the user."""
    # 1. Update user fields
    current_user.preferred_language = pref_data.preferred_language
    current_user.quiet_hours_start = pref_data.quiet_hours_start
    current_user.quiet_hours_end = pref_data.quiet_hours_end
    current_user.critical_alerts_only = pref_data.critical_alerts_only
    
    # 2. Update channels in NotificationPreference
    for channel, enabled in [("web_push", pref_data.push_enabled), ("sms", pref_data.sms_enabled)]:
        pref = db.query(models.NotificationPreference).filter(
            models.NotificationPreference.user_id == current_user.id,
            models.NotificationPreference.channel == channel
        ).first()
        if pref:
            pref.enabled = enabled
        else:
            new_pref = models.NotificationPreference(
                user_id=current_user.id,
                channel=channel,
                enabled=enabled
            )
            db.add(new_pref)
            
    db.commit()
    return {"status": "success", "message": "Notification preferences updated successfully"}


@router.get("/notifications/push/public-key")
def get_push_public_key():
    """Retrieves the VAPID public key for push subscriptions."""
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/notifications/push/subscribe")
def subscribe_push(
    sub_data: PushSubscriptionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registers web push subscription parameters for user browser."""
    # Check if subscription already exists
    existing = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id,
        models.PushSubscription.endpoint == sub_data.endpoint
    ).first()
    
    if existing:
        existing.p256dh = sub_data.p256dh
        existing.auth = sub_data.auth
    else:
        new_sub = models.PushSubscription(
            user_id=current_user.id,
            endpoint=sub_data.endpoint,
            p256dh=sub_data.p256dh,
            auth=sub_data.auth
        )
        db.add(new_sub)
        
    db.commit()
    return {"status": "success", "message": "Push subscription saved successfully"}


@router.get("/farmer/reports")
async def get_field_reports(
    format: str = Query("csv", regex="^(csv|pdf)$"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates downloadable CSV or PDF agronomy reports."""
    farm = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=400, detail="Please register a farm before generating reports.")

    fields = db.query(models.Field).filter(models.Field.farm_id == farm.id).all()
    if not fields:
        raise HTTPException(status_code=400, detail="Please create fields before generating reports.")
        
    field = fields[0]
    crop = db.query(models.Crop).filter(models.Crop.field_id == field.id, models.Crop.status == "growing").first()
    crop_name = crop.name if crop else "No growing crops"

    # Gathers stats
    timeline_logs = db.query(models.TelemetryLog).filter(
        models.TelemetryLog.crop_id == crop.id
    ).order_by(models.TelemetryLog.timestamp.desc()).limit(10).all() if crop else []
    
    avg_moisture = sum(l.soil_moisture for l in timeline_logs) / len(timeline_logs) if timeline_logs else 35.0
    moisture_status = f"{round(avg_moisture, 1)}% Volumetric Water Content (Average)"

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    applied_recs = db.query(models.IrrigationRecommendation).filter(
        models.IrrigationRecommendation.crop_id == crop.id,
        models.IrrigationRecommendation.timestamp >= seven_days_ago
    ).order_by(models.IrrigationRecommendation.timestamp.desc()).all() if crop else []
    
    total_water = sum(r.applied_water_volume_liters for r in applied_recs if r.status == "applied")
    water_saved = sum(r.recommended_water_volume_liters - r.applied_water_volume_liters for r in applied_recs if r.status == "skipped")

    history_logs = []
    for r in applied_recs:
        history_logs.append({
            "date": r.timestamp.strftime("%Y-%m-%d"),
            "time": r.timestamp.strftime("%I:%M %p"),
            "recommended_volume": r.recommended_water_volume_liters,
            "applied_volume": r.applied_water_volume_liters,
            "status": r.status.upper()
        })

    active_alerts_db = db.query(models.AlertEvent).filter(
        models.AlertEvent.field_id == field.id,
        models.AlertEvent.status == "active"
    ).all()
    
    alerts_list = [{
        "severity": a.severity,
        "alert_type": a.alert_type,
        "message": a.message,
        "time": a.created_at.strftime("%Y-%m-%d %I:%M %p")
    } for a in active_alerts_db]

    weather_desc = "Optimal conditions forecast"
    try:
        weather_data = await weather.fetch_weather_data(farm.location_latitude, farm.location_longitude)
        weather_desc = f"{weather_data.get('temp')}°C, {weather_data.get('conditions')}"
    except Exception:
        pass

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(["AgriSmart Pro - Field Agricultural Report"])
        writer.writerow(["Generated on", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow([])
        writer.writerow(["Farmer", current_user.full_name])
        writer.writerow(["Farm", farm.name])
        writer.writerow(["Field", field.name])
        writer.writerow(["Crop", crop_name])
        writer.writerow([])
        writer.writerow(["Soil Moisture", moisture_status])
        writer.writerow(["Total Water Applied (L)", total_water])
        writer.writerow(["Estimated Water Saved (L)", water_saved])
        writer.writerow([])
        writer.writerow(["ACTIVE ALERTS"])
        writer.writerow(["Severity", "Alert Type", "Message", "Time"])
        for a in alerts_list:
            writer.writerow([a["severity"], a["alert_type"], a["message"], a["time"]])
            
        writer.writerow([])
        writer.writerow(["IRRIGATION HISTORY"])
        writer.writerow(["Date", "Time", "Recommended Volume (L)", "Applied Volume (L)", "Status"])
        for h in history_logs:
            writer.writerow([h["date"], h["time"], h["recommended_volume"], h["applied_volume"], h["status"]])
            
        response = StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv")
        response.headers["Content-Disposition"] = f"attachment; filename=report_{field.name}_{datetime.now().strftime('%Y%m%d')}.csv"
        return response
        
    else: # PDF
        pdf_bytes = generate_pdf_report(
            farmer_name=current_user.full_name,
            farm_name=farm.name,
            field_name=field.name,
            crop_name=crop_name,
            moisture_summary=moisture_status,
            irrigation_history=history_logs,
            water_usage=round(total_water, 1),
            weather_summary=weather_desc,
            alerts_list=alerts_list,
            water_saved=round(water_saved, 1)
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=report_{field.name}_{datetime.now().strftime('%Y%m%d')}.pdf"
            }
        )


@router.post("/alerts/evaluate")
async def evaluate_field_alerts_manually(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually triggers evaluation of thresholds and alerts on farmer farms."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    if not farms:
        return {"status": "success", "message": "No farms registered", "triggered_alerts": []}
        
    farm_ids = [f.id for f in farms]
    fields = db.query(models.Field).filter(models.Field.farm_id.in_(farm_ids)).all()
    
    total_triggered = []
    for f in fields:
        new_alerts = await alerts.evaluate_field_alerts(db, f.id)
        for a in new_alerts:
            # Route and dispatch notification for new alerts
            await notifications.dispatch_alert_notifications(db, a)
            total_triggered.append({
                "id": a.id,
                "field_name": f.name,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "message": a.message
            })
            
    return {
        "status": "success",
        "message": f"Evaluated alerts for {len(fields)} fields. Triggered {len(total_triggered)} notifications.",
        "triggered_alerts": total_triggered
    }

@router.get("/farmer/alerts", response_model=List[AlertEventResponse])
def get_farmer_alerts(
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves active or resolved alerts for the farmer's fields."""
    farms = db.query(models.Farm).filter(models.Farm.user_id == current_user.id).all()
    farm_ids = [f.id for f in farms]
    fields = db.query(models.Field).filter(models.Field.farm_id.in_(farm_ids)).all()
    field_ids = [f.id for f in fields]
    
    query = db.query(models.AlertEvent).filter(models.AlertEvent.field_id.in_(field_ids))
    if status:
        query = query.filter(models.AlertEvent.status == status.lower())
        
    return query.order_by(models.AlertEvent.created_at.desc()).all()

@router.get("/farmer/thresholds/{field_id}", response_model=FieldThresholdResponse)
def get_field_thresholds(
    field_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gets configurable thresholds for a field."""
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == field_id,
        models.Farm.user_id == current_user.id
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")

    thresholds = field.thresholds
    if not thresholds:
        thresholds = models.FieldThreshold(field_id=field.id)
        db.add(thresholds)
        db.commit()
        db.refresh(thresholds)

    return {
        "field_id": field.id,
        "critical_moisture": thresholds.critical_moisture,
        "warning_moisture": thresholds.warning_moisture,
        "overwatering_moisture": thresholds.overwatering_moisture,
        "rain_probability_threshold": thresholds.rain_probability_threshold
    }


@router.put("/farmer/thresholds/{field_id}", response_model=FieldThresholdResponse)
def update_field_thresholds(
    field_id: str,
    threshold_data: FieldThresholdUpdate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates configurable thresholds for a field. Validates range: critical < warning < overwatering."""
    field = db.query(models.Field).join(models.Farm).filter(
        models.Field.id == field_id,
        models.Farm.user_id == current_user.id
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found or access denied")

    # Range validations
    if not (threshold_data.critical_moisture < threshold_data.warning_moisture < threshold_data.overwatering_moisture):
        raise HTTPException(
            status_code=422,
            detail="Thresholds must satisfy the range: Critical Moisture < Warning Moisture < Overwatering Moisture"
        )

    thresholds = field.thresholds
    if not thresholds:
        thresholds = models.FieldThreshold(field_id=field.id)
        db.add(thresholds)

    thresholds.critical_moisture = threshold_data.critical_moisture
    thresholds.warning_moisture = threshold_data.warning_moisture
    thresholds.overwatering_moisture = threshold_data.overwatering_moisture
    thresholds.rain_probability_threshold = threshold_data.rain_probability_threshold

    db.commit()
    db.refresh(thresholds)
    background_tasks.add_task(evaluate_and_dispatch, db, field.id)
    
    return {
        "field_id": field.id,
        "critical_moisture": thresholds.critical_moisture,
        "warning_moisture": thresholds.warning_moisture,
        "overwatering_moisture": thresholds.overwatering_moisture,
        "rain_probability_threshold": thresholds.rain_probability_threshold
    }



