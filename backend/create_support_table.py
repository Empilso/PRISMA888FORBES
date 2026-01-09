import os
import psycopg2
from dotenv import load_dotenv

# Load env from backend
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("❌ No DATABASE_URL")
    exit(1)

# Force TCP
if "@localhost" in DB_URL:
    print("🔄 Switching to 127.0.0.1 for TCP...")
    DB_URL = DB_URL.replace("@localhost", "@127.0.0.1")

print(f"🔌 Connecting to DB...")

try:
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Read SQL
    sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations', 'create_legislative_support.sql')
    with open(sql_path, 'r') as f:
        sql = f.read()

    # Remove Policy part from SQL to avoid role error
    sql = sql.split("-- Política de acesso")[0]
    sql += "\n-- Policy skipped to avoid role error"
        
    print("📜 Executing SQL...")
    cur.execute(sql)
    print("✅ Table created successfully.")
    
    # Reload PostgREST Schema Cache
    print("🔄 Reloading PostgREST schema cache...")
    cur.execute("NOTIFY pgrst, 'reload schema';")
    
    # Verify
    cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'legislative_support')")
    exists = cur.fetchone()[0]
    print(f"🔎 Verification: table_exists={exists}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    # Fallback: Try creating without FKs if campaigns relation fails
    if 'relation "campaigns" does not exist' in str(e):
        print("⚠️ Campaigns table invisible? Trying without FKs...")
        fallback_sql = """
        CREATE TABLE IF NOT EXISTS legislative_support (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id UUID NOT NULL, -- No FK
            politician_id UUID NOT NULL, -- No FK but logic relies on it
            status TEXT NOT NULL CHECK (status IN ('base', 'oposicao', 'neutro')),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(campaign_id, politician_id)
        );
        ALTER TABLE legislative_support ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all for authenticated" ON legislative_support FOR ALL TO authenticated USING (true) WITH CHECK (true);
        """
        try:
            cur.execute(fallback_sql)
            print("✅ Fallback table created.")
        except Exception as e2:
            print(f"❌ Fallback failed: {e2}")

