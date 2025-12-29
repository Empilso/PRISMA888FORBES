
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_campaigns():
    print("🔍 Inspecting 'campaigns' table...")
    try:
        resp = supabase.table("campaigns").select("*").limit(1).execute()
        if resp.data:
            print(f"   Keys: {list(resp.data[0].keys())}")
            print(f"   Sample: {resp.data[0]}")
        else:
            print("   Table is empty.")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    inspect_campaigns()
