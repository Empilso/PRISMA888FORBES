import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def list_campaigns():
    print("🔎 Listing active campaigns...")
    res = supabase.table("campaigns").select("id, name").eq("is_active", True).limit(10).execute()
    
    if not res.data:
        print("❌ No active campaigns found.")
        return

    print(f"✅ Found {len(res.data)} campaigns:")
    for c in res.data:
        print(f"ID: {c['id']} | Name: {c['name']}")

if __name__ == "__main__":
    list_campaigns()
