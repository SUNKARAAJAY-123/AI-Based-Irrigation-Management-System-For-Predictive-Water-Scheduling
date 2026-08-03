import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/ai_irrigation_db"
)

# Setup Engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Setup Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Setup Declarative Base
Base = declarative_base()


def get_db() -> Generator:
    """FastAPI Dependency injection provider for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
