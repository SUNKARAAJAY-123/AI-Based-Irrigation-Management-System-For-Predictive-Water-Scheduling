from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.api.routes import router
from ml.prediction import predict
from backend.utils.config import settings
import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("FastAPIMain")

@asynccontextmanager
async def lifespan(app: FastAPI):
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
