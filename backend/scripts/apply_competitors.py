
import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def apply_competitors_v2():
    print("🚀 Criando Tabela de Concorrentes v2 (Schema Aware)...")
    db_url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    
    if not db_url:
        print("❌ Sem conexão com banco.")
        return

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # 1. Encontrar o schema correto onde 'campaigns' vive
        cursor.execute("SELECT schemaname FROM pg_tables WHERE tablename = 'campaigns';")
        res = cursor.fetchone()
        if not res:
            print("❌ Tabela campaigns não encontrada!")
            return
            
        schema = res[0]
        print(f"✅ Schema detectado: {schema}")
        
        # 2. SQL Dinâmico com schema correto
        sql = f"""
        CREATE TABLE IF NOT EXISTS "{schema}".competitors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id UUID NOT NULL REFERENCES "{schema}".campaigns(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            party TEXT,
            risk_level TEXT DEFAULT 'high',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_competitors_campaign ON "{schema}".competitors(campaign_id);
        
        COMMENT ON TABLE "{schema}".competitors IS 'Lista de adversários monitorados';
        """

        cursor.execute(sql)
        print("✅ Tabela 'competitors' criada com sucesso no schema correto!")
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    apply_competitors_v2()
