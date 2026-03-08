import os
import requests
from dotenv import load_dotenv

load_dotenv()
backend_url = "http://localhost:8000"
campaign_id = "8f01a03d-cbee-4395-8245-9353dc8c62cb"

print(f"--- TESTANDO PUBLICAÇÃO DE CAMPANHA: {campaign_id} ---")

# 1. Garantir que existam estratégias 'approved'
from supabase import create_client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

try:
    # Buscar estratégias approved
    strategies = supabase.table("strategies").select("id").eq("campaign_id", campaign_id).eq("status", "approved").execute()
    print(f"Estratégias 'approved' encontradas: {len(strategies.data)}")
    
    if not strategies.data:
        print("Nenhuma estratégia approved. Forçando status approved em uma para teste...")
        any_strat = supabase.table("strategies").select("id").eq("campaign_id", campaign_id).limit(1).execute()
        if any_strat.data:
            supabase.table("strategies").update({"status": "approved"}).eq("id", any_strat.data[0]['id']).execute()
            print(f"Status approved agora em: {any_strat.data[0]['id']}")
        else:
            print("Nenhuma estratégia encontrada na campanha.")

    # 2. Chamar o endpoint de publish
    url_publish = f"{backend_url}/api/campaign/{campaign_id}/publish"
    print(f"Chamando: {url_publish}")
    
    response = requests.post(url_publish, json={"strategy_ids": None})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

except Exception as e:
    print(f"ERRO NO TESTE: {e}")
