import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.api.routes import router
from ml import predict
from backend.utils.config import settings
from database.database import SessionLocal
from backend.services.alerts import evaluate_field_alerts
from backend.services.notifications import dispatch_alert_notifications
from database import models

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("FastAPIMain")

async def scheduled_checker_loop():
    """Lightweight background checking loop that periodically runs alert evaluations on fields."""
    logger.info("Initializing background scheduled notification checker...")
    # Initial startup delay (15 seconds) to allow database connections and setups to stabilize
    await asyncio.sleep(15)
    
    interval = getattr(settings, "SCHEDULED_CHECK_INTERVAL_SECONDS", 60)
    logger.info(f"Background scheduled notification checker active. Run interval: {interval}s")
    
    while True:
        db = None
        try:
            logger.info("Scheduled notification check cycle started.")
            stats = {
                "fields_checked": 0,
                "alerts_evaluated": 0,
                "new_alerts": 0,
                "resolved_alerts": 0,
                "notifications_sent": 0,
                "duplicates_skipped": 0,
                "errors": 0
            }
            
            db = SessionLocal()
            try:
                # Retrieve all active fields
                fields = db.query(models.Field).all()
                for field in fields:
                    try:
                        new_alerts = await evaluate_field_alerts(db, field.id, stats)
                        for a in new_alerts:
                            await dispatch_alert_notifications(db, a, stats)
                    except Exception as field_err:
                        logger.error(f"Error checking field {field.id} in scheduled loop: {field_err}")
                        stats["errors"] += 1
            finally:
                if db:
                    db.close()
                    db = None
            
            # Print structured check cycle log as per specification
            logger.info(
                f"Notification Check - Fields checked: {stats['fields_checked']}, "
                f"Alerts evaluated: {stats['alerts_evaluated']}, "
                f"New alerts: {stats['new_alerts']}, "
                f"Resolved alerts: {stats['resolved_alerts']}, "
                f"Notifications sent: {stats['notifications_sent']}, "
                f"Duplicates skipped: {stats['duplicates_skipped']}, "
                f"Errors: {stats['errors']}"
            )
            
        except Exception as e:
            logger.error(f"Unhandled error in scheduled notification checker: {e}")
            if db:
                try:
                    db.close()
                except Exception:
                    pass
            
        await asyncio.sleep(interval)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Migrate database columns if necessary
    try:
        from database.database import migrate_db_columns
        migrate_db_columns()
    except Exception as e:
        logger.error(f"Error migrating database on startup: {e}")

    # Start scheduled notification checker loop in background task
    asyncio.create_task(scheduled_checker_loop())

    # Load ML models on startup
    logger.info("FastAPI starting up. Loading Machine Learning models...")
    try:
        predict.load_models()
        logger.info("ML models loaded successfully.")
    except Exception as e:
        logger.error(f"Error loading ML models on startup: {e}")
    yield
    logger.info("FastAPI shutting down.")

app = FastAPI(
    title="AI-Based Irrigation Management System",
    description="Full-stack production-ready API gateway.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=getattr(settings, "CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "AI-Based Irrigation Management System API Gateway active.",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.BACKEND_ENV
    }
