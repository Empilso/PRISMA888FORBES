
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL not found")
    exit(1)

MIGRATION_FILE = "migrations/2026-02-07_add_campaign_id_logging.sql"

try:
    print(f"Applying migration: {MIGRATION_FILE}")
    with open(MIGRATION_FILE, "r") as f:
        sql = f.read()

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute(sql)
    print("✅ Campaign Log Migration applied successfully!")
    conn.close()

except Exception as e:
    print(f"❌ Error applying migration: {e}")
