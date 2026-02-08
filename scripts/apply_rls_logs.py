import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv("backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: Missing Supabase credentials in .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

print("🚀 Applying RLS Log Migration...")

# Read the SQL file
migration_file = "migrations/2026-02-07_rls_ai_logs_v2.sql"
try:
    with open(migration_file, "r") as f:
        sql_content = f.read()
        
    # Execute SQL via RPC or finding a way to run raw SQL
    # Supabase-py client doesn't support raw SQL directly on the client instance easily without RPC.
    # However, we can use the `pg` driver if we have the connection string, OR use a specialized RPC function if exists.
    # Since we have the SERVICE_ROLE_KEY, we might just rely on the fact that we can't easily run DDL via the JS/Python client unless we have an RPC for it.
    
    # Text-based approach: We will fallback to psycopg2 using the DATABASE_URL which we saw in .env
    pass

except FileNotFoundError:
    print(f"❌ Error: Migration file {migration_file} not found.")
    sys.exit(1)

# Direct connection approach since client.rpc is limited if no function exists
import psycopg2

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ Error: DATABASE_URL not found.")
    sys.exit(1)

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute(sql_content)
    conn.commit()
    print("✅ Migration applied successfully!")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Migration failed: {e}")
    sys.exit(1)
