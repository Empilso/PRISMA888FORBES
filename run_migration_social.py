import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Erro: DATABASE_URL não encontrada no .env do backend")
    sys.exit(1)

def run_migration():
    print("Conectando ao banco de dados Supabase...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        migration_file = os.path.join(os.path.dirname(__file__), 'migrations', '20260304_create_social_mentions.sql')
        
        print(f"Lendo migration: {migration_file}")
        with open(migration_file, 'r') as f:
            sql = f.read()
            
        print("Executando migration...")
        cur.execute(sql)
        
        print("✅ Migration executada com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro ao rodar migration: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_migration()
