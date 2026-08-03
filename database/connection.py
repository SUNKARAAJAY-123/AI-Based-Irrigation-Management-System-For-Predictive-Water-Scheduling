import os
import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DatabaseConnection")

# Load environment variables from .env in workspace root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB = os.getenv("POSTGRES_DB", "ai_irrigation_db")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

# Resolve DB URL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Initialize Engine with Pooling settings
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True  # Enables automatic connection validation
)


def verify_database_connection(retries: int = 5, delay: float = 2.0) -> bool:
    """Verifies that the database is up and reachable, retrying if necessary."""
    logger.info(f"Attempting to connect to PostgreSQL at {POSTGRES_HOST}:{POSTGRES_PORT}...")
    
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL database.")
            return True
        except OperationalError as err:
            logger.warning(
                f"Connection attempt {attempt}/{retries} failed. Retrying in {delay}s..."
            )
            time.sleep(delay)
            
    logger.error("Could not establish a database connection after multiple attempts.")
    return False


if __name__ == "__main__":
    verify_database_connection()
