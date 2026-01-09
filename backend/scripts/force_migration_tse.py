
import os
import sys
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def force_migration():
    print("🚀 Iniciando migração forçada: Adicionar tse_id em cities...")
    
    # Get connection string (prefer DIRECT URL for migrations if available, else DATABASE_URL)
    db_url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    
    if not db_url:
        # Fallback constructor from individual parts if URL is missing (Supabase style)
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD")
        host = os.getenv("POSTGRES_HOST")
        port = os.getenv("POSTGRES_PORT", "5432")
        db = os.getenv("POSTGRES_DB", "postgres")
        
        if password and host:
             db_url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    
    if not db_url:
        print("❌ Database connection string not found (DATABASE_URL or POSTGRES_* vars).")
        return

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Debug: List tables in ALL schemas using a more robust query
        print("🔍 Listing tables in ALL schemas (Robust)...")
        cursor.execute("SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'cities';")
        tables = cursor.fetchall()
        print(f"Target 'cities' found in: {tables}")
        
        cities_schema = None
        if tables:
            cities_schema = tables[0][0] # Pick first one
        
        if not cities_schema:
            print("❌ Table 'cities' still NOT FOUND via SQL. Permissions issue?")
            return

        print(f"✅ Found 'cities' in schema: {cities_schema}")

        sql = f"""
        ALTER TABLE "{cities_schema}".cities ADD COLUMN IF NOT EXISTS tse_id VARCHAR;
        CREATE INDEX IF NOT EXISTS idx_cities_tse_id ON "{cities_schema}".cities(tse_id);
        COMMENT ON COLUMN "{cities_schema}".cities.tse_id IS 'Código do município na API do TSE (diferente do IBGE)';
        """
        
        print(f"🔧 Executing SQL on {cities_schema}.cities...")
        cursor.execute(sql)
        
        print("✅ Migração concluída com sucesso!")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    force_migration()
