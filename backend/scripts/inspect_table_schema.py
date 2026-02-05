import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def inspect_schema(table_name):
    print(f"🔍 Inspecting Schema for '{table_name}'...")
    db_url = os.getenv("DATABASE_URL")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        cursor.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        
        if not columns:
            print(f"❌ Table '{table_name}' not found or has no columns!")
        else:
            print(f"✅ Columns in '{table_name}':")
            for c in columns:
                print(f" - {c[0]} ({c[1]}) [Nullable: {c[2]}]")

        conn.close()
        
    except Exception as e:
        print(f"❌ DB Error: {e}")

if __name__ == "__main__":
    inspect_schema("campaigns")
