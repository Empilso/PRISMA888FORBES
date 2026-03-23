import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Pegando a URL direta do banco de dados (se disponível)
db_url = os.getenv("DATABASE_URL")

def fix_db_directly():
    if not db_url:
        print("❌ DATABASE_URL não encontrada no ambiente.")
        return

    print("🛠️ Tentando adicionar coluna via conexão direta PostgreSQL...")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE strategies ADD COLUMN IF NOT EXISTS estimated_votes INTEGER DEFAULT 0;")
        conn.close()
        print("✅ Coluna 'estimated_votes' adicionada com sucesso via psycopg2!")
    except Exception as e:
        print(f"❌ Falha na conexão direta: {e}")

if __name__ == "__main__":
    fix_db_directly()
