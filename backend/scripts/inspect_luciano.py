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

res = httpx.get(f"{url}/rest/v1/campaigns?slug=eq.luciano-silva&select=*,profiles(*)", headers=headers)
print("Dados de luciano-silva:")
print(res.json())
