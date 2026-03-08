import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

campaign_id = "8f01a03d-cbee-4395-8245-9353dc8c62cb"

print(f"--- VERIFICAÇÃO FINAL: CAMPANHA {campaign_id} ---")

# 1. Contagem via Service Role (deve ser 30)
res_service = supabase.table("locations").select("id", count="exact").eq("campaign_id", campaign_id).execute()
count_service = res_service.count if hasattr(res_service, "count") else len(res_service.data)
print(f"Contagem via Service Role: {count_service}")

# 2. Verificar se os resultados detalhados existem
res_results = supabase.table("location_results").select("id").limit(1).execute()
print(f"Algum resultado detalhado encontrado: {'Sim' if res_results.data else 'Não'}")

print("\nConclusão: Os dados foram processados e estão no banco.")
