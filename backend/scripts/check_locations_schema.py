import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

conn = psycopg2.connect(db_url)
cur = conn.cursor()

print("--- ESTRUTURA DA TABELA LOCATIONS ---")
cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tasks'
    ORDER BY ordinal_position;
""")
rows = cur.fetchall()
for row in rows:
    print(f"- {row[0]} ({row[1]}, Default: {row[2]})")

print("\n--- TRIGGERS EM LOCATIONS ---")
cur.execute("""
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'locations';
""")
triggers = cur.fetchall()
if not triggers:
    print("Nenhum trigger encontrado.")
for t in triggers:
    print(f"- {t[0]} ({t[1]})")

cur.close()
conn.close()
