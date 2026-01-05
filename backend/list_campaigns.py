import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: Supabase credentials not found in env.")
    exit(1)

supabase = create_client(url, key)

def list_campaigns():
    print("Fetching campaigns...")
    try:
        response = supabase.table("campaigns").select("id, name").limit(5).execute()
        if not response.data:
            print("❌ No campaigns found.")
        else:
            print(f"✅ Found {len(response.data)} campaigns:")
            for c in response.data:
                print(f" - ID: {c['id']} | Name: {c.get('name', 'No Name')}")
                
    except Exception as e:
        print(f"❌ Error fetching campaigns: {e}")

if __name__ == "__main__":
    list_campaigns()
