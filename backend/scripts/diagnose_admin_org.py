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

# 1. Pegar profile do admin
res_admin = httpx.get(f"{url}/rest/v1/profiles?email=eq.admin@prisma888.com&select=*", headers=headers)
print("Profile Admin:")
print(res_admin.json())

# 2. Listar campanhas sem organization_id
res_orphans = httpx.get(f"{url}/rest/v1/campaigns?organization_id=is.null&select=id,slug,candidate_name", headers=headers)
print("\nCampanhas sem Org (Orfas):")
print(res_orphans.json())
