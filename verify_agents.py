import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def verify():
    print("Verifying agents...")
    res = supabase.table("agents").select("id, name, display_name").execute()
    agents = res.data
    print(f"Found {len(agents)} agents.")
    for a in agents:
        print(f"- {a['name']}: {a['display_name']}")

if __name__ == "__main__":
    verify()
