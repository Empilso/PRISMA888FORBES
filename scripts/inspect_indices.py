
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
    cur = conn.cursor()

    print("\n--- INDICES on ai_execution_logs ---")
    cur.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'ai_execution_logs';
    """)
    indices = cur.fetchall()
    for idx in indices:
        print(f"Index: {idx[0]}")
        print(f"Def: {idx[1]}")
        print("-" * 40)

    conn.close()

except Exception as e:
    print(f"Error connecting to DB: {e}")
