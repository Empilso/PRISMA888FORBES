
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("backend/.env")
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
client = create_client(url, key)

res = client.table("municipal_expenses").select("evento", "orgao").limit(10).execute()
print("--- Amostra de Eventos ---")
for i, row in enumerate(res.data):
    evento = row.get("evento", "N/A")
    orgao = row.get("orgao", "N/A")
    print(f"{i+1}. [{orgao}] {evento[:100]}...")
