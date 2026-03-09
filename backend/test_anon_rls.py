import os
from supabase import create_client

# Usando os valores coletados do .env.local
url = "https://gsmmanjpsdbfwmnmtgpg.supabase.co"
anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTcyNTMsImV4cCI6MjA3ODg3MzI1M30.3aN1W_wiMo1fin3UgYbHIisPw_-k7GRP6qIg8xvblp0"

supabase = create_client(url, anon_key)

campaign_id = "0fc1e8fe-149b-48b1-bd42-3c4d2f1f82b1" # Campanha do Weber

def test_anon_query():
    print(f"🕵️ Simulando FRONTEND (Anon Key) - Buscando estratégias para: {campaign_id}")
    try:
        # Tenta a query exatamente como no setup/page.tsx
        res = supabase.table("strategies").select("*", count="exact").eq("campaign_id", campaign_id).order("created_at", desc=True).execute()
        print(f"✅ Sucesso! Encontradas {len(res.data)} estratégias com a chave anon.")
        if res.data:
            print(f"📋 Exemplo: {res.data[0]['title']}")
    except Exception as e:
        print(f"❌ Erro na query (Anon Key): {e}")

if __name__ == "__main__":
    test_anon_query()
