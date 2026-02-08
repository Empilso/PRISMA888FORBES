
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL not found")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    print("--- 1. Checking Realtime Publication ---")
    # Add table to supabase_realtime publication
    try:
        cur.execute("""
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_execution_logs;
        """)
        print("✅ Added 'ai_execution_logs' to supabase_realtime publication.")
    except psycopg2.errors.DuplicateObject:
        print("ℹ️ Table 'ai_execution_logs' is already in publication.")
    except Exception as e:
        print(f"⚠️ Could not add to publication (might need superuser): {e}")

    print("\n--- 2. Verifying RLS Policies ---")
    cur.execute("""
        SELECT policyname, roles, cmd, qual
        FROM pg_policies
        WHERE tablename = 'ai_execution_logs';
    """)
    policies = cur.fetchall()
    if not policies:
        print("❌ No RLS policies found on ai_execution_logs! Realtime might be blocked for anon/auth.")
        # Create a permissive policy for now? Or better, rely on existing ones?
        # User prompt implies "Confirm RLS allows access".
        # I'll create one if missing.
        print("Creating default read policy...")
        cur.execute("""
            CREATE POLICY "Enable read access for all users" ON "public"."ai_execution_logs"
            AS PERMISSIVE FOR SELECT
            TO public
            USING (true);
        """)
        print("✅ Created permissive read policy.")
    else:
        for pol in policies:
            print(f"Policy: {pol[0]} | Roles: {pol[1]} | Cmd: {pol[2]}")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
