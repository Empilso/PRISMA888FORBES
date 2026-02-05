
import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def create_competitors_table():
    print("🚀 Configurando Tabela de Concorrentes (Schema Inteligente)...")
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
            print("❌ Tabela campaigns não encontrada! Verifique se seu banco está rodando.")
            return
            
        schema = res[0]
        print(f"✅ Schema base detectado: {schema}")
        
        # 2. Criar tabela competitors no MESMO schema da campaigns
        # Adicionei 'color' para o mapa e 'avatar_url' para a UI
        sql = f"""
        CREATE TABLE IF NOT EXISTS "{schema}".competitors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id UUID NOT NULL REFERENCES "{schema}".campaigns(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            party TEXT,
            risk_level TEXT DEFAULT 'high',
            color TEXT DEFAULT '#EF4444', -- Vermelho padrão para inimigos
            avatar_url TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_competitors_campaign ON "{schema}".competitors(campaign_id);
        
        COMMENT ON TABLE "{schema}".competitors IS 'Lista de adversários monitorados pelo Radar de Ameaças';
        """

        print(f"🔧 Executando DDL no schema '{schema}'...")
        cursor.execute(sql)
        print("✅ Tabela 'competitors' criada/verificada com sucesso!")
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    create_competitors_table()
