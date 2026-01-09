
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def mask_password(url):
    if not url: return "None"
    if ":" in url and "@" in url:
        # postgres://user:password@host:port/db
        try:
            prefix, rest = url.split("://")
            creds, address = rest.split("@")
            user, password = creds.split(":")
            return f"{prefix}://{user}:******@{address}"
        except:
            return "Invalid Format"
    return url

def inspect_env():
    print("--- Inspecting ENV Connection Strings ---")
    
    db_url = os.getenv("DATABASE_URL")
    direct_url = os.getenv("DIRECT_URL")
    
    print(f"DATABASE_URL: {mask_password(db_url)}")
    print(f"DIRECT_URL:   {mask_password(direct_url)}")
    
    print("\n--- Postgres Components ---")
    print(f"USER: {os.getenv('POSTGRES_USER')}")
    print(f"HOST: {os.getenv('POSTGRES_HOST')}")
    print(f"PORT: {os.getenv('POSTGRES_PORT')}")
    print(f"DB:   {os.getenv('POSTGRES_DB')}")

if __name__ == "__main__":
    inspect_env()
