
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

    print("\n--- ENUM: user_role ---")
    cur.execute("""
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'user_role';
    """)
    enums = cur.fetchall()
    if not enums:
        print("Enum 'user_role' not found.")
    else:
        print("Allowed values:")
        for e in enums:
            print(f"- {e[0]}")

    conn.close()

except Exception as e:
    print(f"Error connecting to DB: {e}")
