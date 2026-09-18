import os
import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

logger = logging.getLogger("DatabaseConfig")

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

def resolve_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    backend_env = os.getenv("BACKEND_ENV", "development").lower()
    
    if not url:
        if backend_env == "production":
            logger.warning(
                "CRITICAL WARNING: DATABASE_URL environment variable is not configured in Render production! "
                "Falling back to local PostgreSQL connection string."
            )
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "postgres")
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "ai_irrigation_db")
        url = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"

    # Fix SQLAlchemy 2.0 dialect prefix
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Automatically attach sslmode=require for production/external database connections if not specified
    is_external = "localhost" not in url and "127.0.0.1" not in url
    if (backend_env == "production" or "supabase" in url.lower() or is_external) and "sslmode" not in url:
        delimiter = "&" if "?" in url else "?"
        url = f"{url}{delimiter}sslmode=require"

    return url

DATABASE_URL = resolve_database_url()

# Setup Engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
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
