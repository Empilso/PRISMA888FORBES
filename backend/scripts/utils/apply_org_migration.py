
import os
import psycopg2
from dotenv import load_dotenv

# Load .env explicitly from current directory
load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

def run_migration():
    if not DB_URL:
        print("❌ DATABASE_URL not found in .env")
        return

    try:
        print(f"🔌 Connecting to DB...")
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        migration_file = "migrations/20260219_create_organizations.sql"
        print(f"🚀 Reading migration: {migration_file}")
        
        with open(f"../{migration_file}", "r") as f:
            sql = f.read()
            
        print("🚀 Executing SQL...")
        cur.execute(sql)
        
        print("✅ MIGRATION SUCCESS! Multi-tenant infrastructure applied.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ MIGRATION FAILED: {e}")

if __name__ == "__main__":
    run_migration()
