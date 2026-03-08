import os
import httpx
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Profile": "public"
}

# 1. Listar todos os profiles
print("--- TODOS OS PROFILES ---")
res_p = httpx.get(f"{url}/rest/v1/profiles?select=*", headers=headers)
print(res_p.json())

# 2. Deletar a campanha luciano-silva para permitir novo teste
print("\n--- DELETANDO CAMPANHA ORFA LUCIANO-SILVA ---")
res_del = httpx.delete(f"{url}/rest/v1/campaigns?slug=eq.luciano-silva", headers=headers)
print("Status Delecao:", res_del.status_code)
