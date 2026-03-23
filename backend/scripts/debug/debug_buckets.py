import os
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def list_buckets():
    try:
        buckets = supabase.storage.list_buckets()
        print("Buckets found:")
        for b in buckets:
            print(f" - {b.name}")
    except Exception as e:
        print(f"Error: {e}")

list_buckets()
