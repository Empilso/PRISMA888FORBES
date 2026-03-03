import os
import httpx
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def migrate():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)

    print("🚀 Iniciando Upgrade de Onisciência Social (QI 190)...")
    
    # Nota: Em ambientes Supabase, para rodar SQL puro sem RPC, precisamos de acesso direto.
    # Dado o erro anterior de psql, vou focar em garantir que o backend Python lide com a estrutura,
    # mas vou registrar os comandos que seriam necessarios via Dashboard.
    
    print("⚠️  AVISO: Este script valida a conectividade e prepara o backend.")
    print("As alteracoes SQL de colunas (target_type, rename handle -> target) devem ser feitas via Dashboard Supabase se o psql falhar.")
    
    try:
        res = supabase.table("social_monitors").select("*").limit(1).execute()
        print(f"✅ Conexao OK. Estado da tabela: {res.data[0].keys() if res.data else 'Tabela vazia'}")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    migrate()
