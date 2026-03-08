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

res = httpx.get(f"{url}/rest/v1/campaigns?select=slug,candidate_name", headers=headers)
print("Slugs em campaigns:")
print(res.json())
