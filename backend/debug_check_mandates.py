
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def list_tables():
    print("🔍 Listing tables...")
    try:
        # We can't list tables directly via client easily without SQL, 
        # but we can try to select from 'mandates' to see if it errors or works.
        resp = supabase.table("mandates").select("id").limit(1).execute()
        print("✅ Table 'mandates' exists.")
        print(f"   Data: {resp.data}")
    except Exception as e:
        print(f"❌ Table 'mandates' check failed: {e}")

if __name__ == "__main__":
    list_tables()
