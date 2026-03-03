
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("backend/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Supabase credentials not found")
    sys.exit(1)

supabase: Client = create_client(url, key)

# Get Weber Manga ID
politicians = supabase.table("politicians").select("*").ilike("name", "%Weber Manga%").execute()
if not politicians.data:
    print("❌ Weber Manga not found")
    sys.exit(1)

pid = politicians.data[0]["id"]
print(f"Found Politician: {politicians.data[0]['name']} (ID: {pid})")

# Get Mandate
mandates = supabase.table("mandates").select("*, offices(name), cities(name)").eq("politician_id", pid).execute()
if not mandates.data:
    print("❌ Mandate not found")
    sys.exit(1)

m = mandates.data[0]
print(f"✅ Found Mandate: {m['id']}")
print(f"   Office: {m['offices']['name']}")
print(f"   City: {m['cities']['name']}")
print(f"   MANDATE_ID={m['id']}")
