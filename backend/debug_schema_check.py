
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais não encontradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_tables():
    print("🔍 Inspecionando tabelas públicas...")
    try:
        # Tenta listar tabelas conhecidas para ver se existem
        known_tables = [
            "politicians", "campaigns", "mandates", 
            "legislative_support", "campaign_allies", "political_articulation",
            "cities", "offices"
        ]
        
        found = []
        missing = []
        
        for table in known_tables:
            try:
                # Tenta um select simples limit 0
                supabase.table(table).select("count", count="exact").limit(0).execute()
                found.append(table)
            except Exception:
                missing.append(table)
                
        print(f"✅ Tabelas Encontradas: {found}")
        print(f"❌ Tabelas Não Encontradas (ou sem permissão): {missing}")
        
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    # Extract Project ID
    try:
        url = os.getenv("SUPABASE_URL", "")
        if "://" in url:
            # https://<project_id>.supabase.co
            parts = url.split("://")[1].split(".")
            if parts:
                print(f"🆔 PROJECT ID: {parts[0]}")
    except:
        pass
    inspect_tables()
