import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

if not DB_URL:
    print("❌ DATABASE_URL not found in .env")
    exit(1)

try:
    print("🔌 Connecting to Database...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # 1. Verify Existence
    print("🔍 Checking table existence...")
    cur.execute("SELECT to_regclass('public.ai_execution_logs');")
    result = cur.fetchone()
    
    if result and result[0]:
        print(f"✅ Table 'ai_execution_logs' found: {result[0]}")
    else:
        print("❌ Table 'ai_execution_logs' NOT FOUND! Creating it now...")
        with open("create_logs_table.sql", "r") as f:
            sql = f.read()
            cur.execute(sql)
        print("✅ Table created successfully.")

    # 2. Force Schema Reload
    print("🔄 Notifying PostgREST to reload schema...")
    cur.execute("NOTIFY pgrst, 'reload schema';")
    print("✅ Notification sent.")

    # 3. RLS & Permissions
    print("🔒 Configuring RLS and Policies...")
    
    # Enable RLS
    cur.execute('ALTER TABLE "ai_execution_logs" ENABLE ROW LEVEL SECURITY;')
    
    # Policy: Service Role (Full Access)
    cur.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'ai_execution_logs' AND policyname = 'Enable all for service role'
            ) THEN
                CREATE POLICY "Enable all for service role" ON "ai_execution_logs" TO service_role USING (true) WITH CHECK (true);
            END IF;
        END $$;
    """)
    
    # Policy: Backend/Anon Read (if strictly needed, usually service role handles backend, 
    # but frontend might read via client)
    cur.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'ai_execution_logs' AND policyname = 'Enable read for anon'
            ) THEN
                CREATE POLICY "Enable read for anon" ON "ai_execution_logs" FOR SELECT TO anon USING (true);
            END IF;
        END $$;
    """)
    
    print("✅ RLS and Policies configured.")

    cur.close()
    conn.close()
    print("🚀 Done.")

except Exception as e:
    print(f"❌ Error: {e}")
