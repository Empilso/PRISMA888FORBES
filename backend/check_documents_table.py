import os
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_table():
    print("🔎 Checking if 'documents' table exists...")
    try:
        res = supabase.table("documents").select("id").limit(1).execute()
        print(f"✅ Table exists. Sample: {res.data}")
    except Exception as e:
        print(f"❌ Table check failed: {e}")

check_table()
