import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

campaign_id = "0fc1e8fe-149b-48b1-bd42-3c4d2f1f82b1" # Campanha do Weber

def test_strategies_query():
    print(f"🔍 Testando query de estratégias para: {campaign_id}")
    try:
        res = supabase.table("strategies").select("*").eq("campaign_id", campaign_id).execute()
        print(f"✅ Sucesso! Encontradas {len(res.data)} estratégias.")
        if res.data:
            print(f"📋 Exemplo: {res.data[0]['title']}")
    except Exception as e:
        print(f"❌ Erro na query: {e}")

if __name__ == "__main__":
    test_strategies_query()
