import os
from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    BACKEND_APP_NAME: str = "AI Irrigation Management System"
    BACKEND_DEBUG: bool = True
    BACKEND_ENV: str = "development"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # PostgreSQL Database Settings
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "ai_irrigation_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: Optional[str] = None
    ASYNC_DATABASE_URL: Optional[str] = None

    # Browser origins allowed to call the API. Use a comma-separated list.
    CORS_ORIGINS: str = "http://localhost:3000"

    # External APIs
    OPENWEATHER_API_KEY: Optional[str] = None
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"
    WEATHER_PROVIDER: str = "open_meteo"
    WEATHER_API_KEY: Optional[str] = None
    WEATHER_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    WEATHER_CACHE_TTL_SECONDS: int = 900
    SARVAM_AI_API_KEY: Optional[str] = None
    SARVAM_AI_BASE_URL: str = "https://api.sarvam.ai"

    # Notification Service Credentials
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_FROM_EMAIL: Optional[str] = None
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_CLAIM_EMAIL: str = "admin@example.com"

    # ML Configs
    ML_MODELS_PATH: str = "../ml/models"
    ML_DEFAULT_SOIL_MOISTURE_THRESHOLD: float = 0.35
    CROP_OPTIMIZATION_MODEL_TYPE: str = "random_forest"
    PREFERRED_IRRIGATION_WINDOW: str = "05:00-09:00"

    # Sensor failure and missing check timeouts (in minutes)
    SENSOR_WARNING_TIMEOUT_MINUTES: int = 30
    SENSOR_CRITICAL_TIMEOUT_MINUTES: int = 60

    # Notification cooldowns (in minutes)
    COOLDOWN_CRITICAL_MINUTES: int = 30
    COOLDOWN_WARNING_MINUTES: int = 120
    COOLDOWN_INFO_MINUTES: int = 1440

    # Scheduled checker cycle interval (in seconds)
    SCHEDULED_CHECK_INTERVAL_SECONDS: int = 60

    # Load environment variables from .env
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_db_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    def get_async_db_url(self) -> str:
        if self.ASYNC_DATABASE_URL:
            return self.ASYNC_DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        insecure_values = {
            "placeholder_secret_key_change_me_in_production",
            "your_super_secret_jwt_key_here",
        }
        if not value or value in insecure_values:
            raise ValueError("JWT_SECRET_KEY must be configured with a secure, unique value.")
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


# Instantiate global settings
settings = Settings()
