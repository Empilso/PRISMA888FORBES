
import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def debug_db():
    print("🚀 Debug DB Connection...")
    db_url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    
    if not db_url:
        print("❌ No connection string.")
        return

    try:
        print(f"🔌 Connecting to: {db_url.split('@')[-1]}") # Hide credentials
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        cursor.execute("SELECT current_database(), current_user, current_schema();")
        info = cursor.fetchone()
        print(f"ℹ️ Connected as: {info}")
        
        print("\n🔍 Listing ALL tables in 'public' schema:")
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
        tables = cursor.fetchall()
        for t in tables:
            print(f" - {t[0]}")
            
        print("\n🔍 Listing ALL tables in ANY schema:")
        cursor.execute("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') LIMIT 20;")
        all_tables = cursor.fetchall()
        for t in all_tables:
            print(f" - {t[0]}.{t[1]}")

        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_db()
