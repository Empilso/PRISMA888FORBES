
import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def apply_postgis():
    print("🚀 Ativando PostGIS Enterprise...")
    db_url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    
    if not db_url:
        print("❌ Sem conexão com banco.")
        return

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Read SQL file
        migration_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "migrations", "enable_postgis_enterprise.sql")
        
        with open(migration_path, 'r') as f:
            sql = f.read()

        print(f"🔧 Executando Transformação Espacial (Pode levar alguns segundos)...")
        cursor.execute(sql)
        
        print("✅ SUCESSO! PostGIS ativado. Sua tabela 'locations' agora é ESPACIAL (Enterprise Ready).")
        print("   - Índice GIST criado: Buscas agora são logarítmicas.")
        print("   - Função get_map_clusters criada: Backend pronto para streaming.")
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    apply_postgis()
