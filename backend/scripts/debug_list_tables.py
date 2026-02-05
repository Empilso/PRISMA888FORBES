import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def list_tables():
    print("🔍 Listing All Tables in Database...")
    db_url = os.getenv("DATABASE_URL")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        if not tables:
            print("❌ No tables found in public schema!")
        else:
            print(f"✅ Found {len(tables)} tables:")
            for t in tables:
                print(f" - {t[0]}")

        conn.close()
        
    except Exception as e:
        print(f"❌ DB Error: {e}")

if __name__ == "__main__":
    list_tables()
