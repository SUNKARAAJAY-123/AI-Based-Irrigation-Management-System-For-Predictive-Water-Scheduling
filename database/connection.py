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

def resolve_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    backend_env = os.getenv("BACKEND_ENV", "development").lower()

    if not url:
        if backend_env == "production":
            logger.warning("CRITICAL WARNING: DATABASE_URL is not set in production!")
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "postgres")
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "ai_irrigation_db")
        url = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    is_external = "localhost" not in url and "127.0.0.1" not in url
    if (backend_env == "production" or "supabase" in url.lower() or is_external) and "sslmode" not in url:
        delimiter = "&" if "?" in url else "?"
        url = f"{url}{delimiter}sslmode=require"

    return url

DATABASE_URL = resolve_database_url()

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
    logger.info("Attempting to connect to PostgreSQL database...")
    
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
