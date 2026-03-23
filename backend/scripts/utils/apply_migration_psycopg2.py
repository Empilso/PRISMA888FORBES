
import os
import psycopg2
from dotenv import load_dotenv

# Load .env explicitly from current directory verify
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
        
        # DEBUG: Connection Info
        cur.execute("SELECT current_user, current_database(), current_schema();")
        user_info = cur.fetchone()
        print(f"👤 Connected as: {user_info}")
        
        # DEBUG: Search Path
        cur.execute("SHOW search_path;")
        print(f"🛣️ Search Path: {cur.fetchone()}")
        
        # DEBUG: List ALL tables in public
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = [r[0] for r in cur.fetchall()]
        print(f"📋 Public Tables: {tables}")
        
        if 'campaigns' not in tables:
            print("⚠️ 'campaigns' NOT found. Will attempt creation WITHOUT Foreign Keys as fallback.")
            # Fallback SQL without FKs
            sql = """
            CREATE TABLE IF NOT EXISTS legislative_support (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                campaign_id UUID NOT NULL, -- FK removed
                politician_id UUID NOT NULL, -- FK removed
                status TEXT NOT NULL CHECK (status IN ('base', 'oposicao', 'neutro')),
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(campaign_id, politician_id)
            );
            ALTER TABLE legislative_support ENABLE ROW LEVEL SECURITY;
            """
        else:
            print("✅ 'campaigns' found. Proceeding with standard migration.")
            with open("migrations/create_legislative_support.sql", "r") as f:
                sql = f.read()
            
        print("🚀 Executing SQL...")
        cur.execute(sql)
        
        print("✅ MIGRATION SUCCESS! Table 'legislative_support' created/verified.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ MIGRATION FAILED: {e}")

if __name__ == "__main__":
    run_migration()
