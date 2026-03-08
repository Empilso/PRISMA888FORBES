import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

migration_path = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/migrations/20260307_fix_admin_rls.sql"

print(f"--- APLICANDO MIGRAÇÃO: {os.path.basename(migration_path)} ---")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    with open(migration_path, "r") as f:
        sql = f.read()
    
    cur.execute(sql)
    conn.commit()
    
    print("Migração aplicada com SUCESSO!")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"ERRO ao aplicar migração: {e}")
