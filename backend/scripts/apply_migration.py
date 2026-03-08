import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

migration_file = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/migrations/20260307_fix_all_tables_rls.sql"

print(f"--- EXECUTANDO MIGRAÇÃO: {os.path.basename(migration_file)} ---")
try:
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute(sql)
    print("✅ Migração aplicada com sucesso!")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ ERRO ao aplicar migração: {e}")
