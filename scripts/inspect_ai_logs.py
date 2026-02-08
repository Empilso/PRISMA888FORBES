
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

    print("\n--- TABLE: ai_execution_logs SCHEMA ---")
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'ai_execution_logs'
        ORDER BY ordinal_position;
    """)
    columns = cur.fetchall()
    if not columns:
        print("Table 'ai_execution_logs' not found.")
    else:
        print(f"{'Column':<20} | {'Type':<15} | {'Nullable':<10} | {'Default'}")
        print("-" * 60)
        for col in columns:
            print(f"{col[0]:<20} | {col[1]:<15} | {col[2]:<10} | {col[3]}")

    print("\n--- CONSTRAINTS ---")
    cur.execute("""
        SELECT conname, contype, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'ai_execution_logs'::regclass;
    """)
    constraints = cur.fetchall()
    for con in constraints:
        print(f"Name: {con[0]} | Type: {con[1]} | Def: {con[2]}")

    print("\n--- RECENT DATA (Last 5) ---")
    cur.execute("""
        SELECT id, trace_id, LEFT(raw_input, 50), LEFT(raw_output, 50), created_at
        FROM ai_execution_logs
        ORDER BY created_at DESC
        LIMIT 5;
    """)
    rows = cur.fetchall()
    for row in rows:
        print(row)

    print("\n--- TRACE_ID DUPLICATES ---")
    cur.execute("""
        SELECT trace_id, COUNT(*)
        FROM ai_execution_logs
        WHERE trace_id IS NOT NULL
        GROUP BY trace_id
        HAVING COUNT(*) > 1;
    """)
    dupes = cur.fetchall()
    if not dupes:
        print("No duplicates found.")
    else:
        for d in dupes:
            print(f"Trace ID: {d[0]} | Count: {d[1]}")

    conn.close()

except Exception as e:
    print(f"Error connecting to DB: {e}")
