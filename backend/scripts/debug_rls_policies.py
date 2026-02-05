import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def debug_rls():
    print("🔍 Inspecting RLS Policies for 'competitors'...")
    db_url = os.getenv("DATABASE_URL")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        cursor.execute("SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'analysis_runs';")
        policies = cursor.fetchall()
        
        if not policies:
            print("❌ No policies found for 'competitors'!")
        else:
            for p in policies:
                print(f"📜 Policy: {p[0]} | Command: {p[1]} | Roles: {p[2]} | Using: {p[3]} | With Check: {p[4]}")

        # Check if RLS is enabled
        cursor.execute("SELECT relrowsecurity FROM pg_class WHERE relname = 'competitors';")
        rls_enabled = cursor.fetchone()[0]
        print(f"🔒 RLS Enabled: {rls_enabled}")

        conn.close()
        
    except Exception as e:
        print(f"❌ DB Error: {e}")

if __name__ == "__main__":
    debug_rls()
