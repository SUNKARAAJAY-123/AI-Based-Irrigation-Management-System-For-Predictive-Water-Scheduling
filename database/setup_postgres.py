import os
import sys
import zipfile
import urllib.request
import subprocess
import time
import shutil

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_PATH = os.path.join(BASE_DIR, "postgresql.zip")
PG_DIR = os.path.join(BASE_DIR, "pgsql")
DATA_DIR = os.path.join(BASE_DIR, "postgres_data")
LOG_PATH = os.path.join(BASE_DIR, "postgres.log")

# EnterpriseDB Binary URL for Windows 64-bit PostgreSQL 15.3
DOWNLOAD_URL = "https://get.enterprisedb.com/postgresql/postgresql-15.3-1-windows-x64-binaries.zip"

def report_progress(block_num, block_size, total_size):
    read_so_far = block_num * block_size
    if total_size > 0:
        percent = min(100, (read_so_far * 100) // total_size)
        sys.stdout.write(f"\rDownloading PostgreSQL: {percent}% ({read_so_far // (1024*1024)}MB / {total_size // (1024*1024)}MB)")
        sys.stdout.flush()
    else:
        sys.stdout.write(f"\rDownloaded {read_so_far // (1024*1024)}MB")
        sys.stdout.flush()

def download_pg():
    if os.path.exists(ZIP_PATH):
        print("Zip already downloaded.")
        return
    print(f"Downloading from {DOWNLOAD_URL}...")
    urllib.request.urlretrieve(DOWNLOAD_URL, ZIP_PATH, report_progress)
    print("\nDownload complete.")

def extract_pg():
    if os.path.exists(PG_DIR):
        print("PostgreSQL already extracted.")
        return
    print("Extracting zip file...")
    with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall(BASE_DIR)
    print("Extraction complete.")

def init_db():
    if os.path.exists(DATA_DIR):
        print("Data directory already exists. Skipping initdb.")
        return
    print("Initializing database...")
    initdb_path = os.path.join(PG_DIR, "bin", "initdb.exe")
    
    # Run initdb: username postgres, auth-method trust, encoding UTF8
    cmd = [initdb_path, "-U", "postgres", "-A", "trust", "-E", "UTF8", "-D", DATA_DIR]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Error during initdb:")
        print(res.stderr)
        sys.exit(1)
    print("Database cluster initialized successfully.")

def start_pg():
    pg_ctl = os.path.join(PG_DIR, "bin", "pg_ctl.exe")
    print("Starting PostgreSQL server...")
    
    # Start pg server
    cmd = [pg_ctl, "-D", DATA_DIR, "-l", LOG_PATH, "start"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0:
        print("Failed to start PostgreSQL:")
        print(res.stderr)
        # Check if port is already in use
        print("Checking if port 5432 is in use...")
    time.sleep(3) # Wait for startup

def create_database():
    psql = os.path.join(PG_DIR, "bin", "psql.exe")
    print("Creating database 'ai_irrigation_db' if not exists...")
    
    # Check if database exists
    check_cmd = [psql, "-U", "postgres", "-d", "postgres", "-c", "SELECT 1 FROM pg_database WHERE datname='ai_irrigation_db';"]
    res = subprocess.run(check_cmd, capture_output=True, text=True)
    
    if "1 row" not in res.stdout and "1" not in res.stdout:
        create_cmd = [psql, "-U", "postgres", "-d", "postgres", "-c", "CREATE DATABASE ai_irrigation_db;"]
        res = subprocess.run(create_cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print("Database 'ai_irrigation_db' created successfully.")
        else:
            print("Error creating database:")
            print(res.stderr)
    else:
        print("Database 'ai_irrigation_db' already exists.")

def main():
    try:
        download_pg()
        extract_pg()
        init_db()
        start_pg()
        create_database()
        print("\nPortable PostgreSQL Setup Complete!")
        print(f"Data folder: {DATA_DIR}")
        print(f"Logs: {LOG_PATH}")
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
