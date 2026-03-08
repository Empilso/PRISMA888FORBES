import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

campaign_id = "8f01a03d-cbee-4395-8245-9353dc8c62cb"

print(f"--- DOCUMENTOS DA CAMPANHA {campaign_id} ---")
try:
    result = supabase.table("documents").select("*").eq("campaign_id", campaign_id).execute()
    print(f"Encontrados {len(result.data)} documentos.")
    for doc in result.data:
        print(f"- Tipo: {doc['file_type']}, URL: {doc['file_url']}")
except Exception as e:
    print(f"ERRO: {e}")
