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
    pool_pre_ping=True,
    connect_args={"client_encoding": "utf8"}
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


def migrate_db_columns():
    """Runs raw DDL to add the missing columns to existing tables if they don't exist yet."""
    from sqlalchemy import text
    import logging
    logger = logging.getLogger("DatabaseMigration")
    logger.info("Checking and executing column migrations if necessary...")
    
    # Create all tables first if they don't exist yet
    from database.database import Base
    from database import models
    Base.metadata.create_all(bind=engine)

    queries = [
        "ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS resolution_reason VARCHAR(500);",
        "ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS condition VARCHAR(255);",
        "ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS alert_id VARCHAR(36);",
        "ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS channel VARCHAR(50);",
        "ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS language VARCHAR(50);",
        "ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_start VARCHAR(5);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_end VARCHAR(5);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS critical_alerts_only BOOLEAN DEFAULT FALSE;"
    ]
    try:
        with engine.begin() as conn:
            for q in queries:
                conn.execute(text(q))
        logger.info("Database columns migration completed successfully.")
    except Exception as e:
        logger.error(f"Failed to migrate database columns: {e}")
