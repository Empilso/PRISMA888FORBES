
import os
import sys
import psycopg2
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def run_migration():
    print("🚀 Iniciando migração v2: Adicionar strategy_mode em campaigns...")
    
    # Get connection string
    db_url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    
    if not db_url:
        print("❌ String de conexão não encontrada.")
        return

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Encontrar o schema da tabela campaigns
        print("🔍 Procurando tabela 'campaigns'...")
        cursor.execute("SELECT schemaname FROM pg_tables WHERE tablename = 'campaigns';")
        results = cursor.fetchall()
        
        if not results:
            print("❌ Tabela 'campaigns' não encontrada em nenhum schema.")
            return
            
        schema = results[0][0]
        print(f"✅ Tabela encontrada no schema: {schema}")
        
        # 2. Executar SQL
        # Usando raw SQL hardcoded para garantir que use o schema correto
        sql = f"""
        ALTER TABLE "{schema}".campaigns ADD COLUMN IF NOT EXISTS strategy_mode TEXT DEFAULT 'territory';
        
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_strategy_mode') THEN 
                ALTER TABLE "{schema}".campaigns 
                ADD CONSTRAINT check_strategy_mode 
                CHECK (strategy_mode IN ('territory', 'ideological', 'structural'));
            END IF; 
        END $$;
        
        COMMENT ON COLUMN "{schema}".campaigns.strategy_mode IS 'Define o arquétipo da estratégia';
        """

        print(f"🔧 Executando SQL em {schema}.campaigns...")
        cursor.execute(sql)
        
        print("✅ Migração concluída com sucesso!")
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    run_migration()
