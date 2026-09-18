import os
import sys
from urllib.parse import urlparse
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

from database.database import DATABASE_URL

def mask_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        if parsed.password:
            masked = url.replace(f":{parsed.password}@", ":****@")
            return masked
        return url
    except Exception:
        return "postgresql://****:****@****"

def test_supabase_connection():
    print("=" * 60)
    print("SUPABASE / POSTGRESQL CONNECTION TEST")
    print("=" * 60)
    print(f"Target Database URL: {mask_url(DATABASE_URL)}")
    print("Connecting...")

    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 10})
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version(), current_database(), current_user;")).fetchone()
            print("\n✅ CONNECTION SUCCESSFUL!")
            print(f"• Database Name: {result[1]}")
            print(f"• Connected User: {result[2]}")
            print(f"• PostgreSQL Version: {result[0]}")
            print("=" * 60)
            return True
    except Exception as e:
        print("\n❌ CONNECTION FAILED!")
        print(f"Error Details: {e}")
        print("\n💡 TROUBLESHOOTING STEPS:")
        print("1. Copy your Supabase PostgreSQL URI from Supabase Dashboard -> Settings -> Database -> Connection String.")
        print("2. Ensure YOUR_SUPABASE_PASSWORD in .env / Render Environment Variables is replaced with your actual database password.")
        print("3. Ensure sslmode=require is included at the end of the URL.")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = test_supabase_connection()
    sys.exit(0 if success else 1)
