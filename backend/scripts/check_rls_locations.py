import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

conn = psycopg2.connect(db_url)
cur = conn.cursor()

tables = ["locations", "documents", "location_results"]

print("--- VERIFICANDO RLS E POLÍTICAS ---")
for table in tables:
    print(f"\nTabela: {table}")
    # Verificar se RLS está habilitado
    cur.execute(f"SELECT relrowsecurity FROM pg_class WHERE relname = '{table}';")
    rls = cur.fetchone()
    print(f"RLS Habilitado: {rls[0] if rls else 'Desconhecido'}")
    
    # Listar políticas
    cur.execute(f"SELECT policyname, qual FROM pg_policies WHERE tablename = '{table}';")
    policies = cur.fetchall()
    if not policies:
        print("Nenhuma política encontrada.")
    for name, qual in policies:
        print(f"- Política: {name}")
        print(f"  Definição: {qual}")

cur.close()
conn.close()
