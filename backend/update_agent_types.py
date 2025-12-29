import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def update_agents():
    names = ["radar-extrator-promessas", "radar-fiscal-verbas"]
    print(f"🔄 Updating types to 'radar' for: {names}")
    
    # Update type to 'radar'
    res = supabase.table("personas").update({"type": "radar"}).in_("name", names).execute()
    
    print(f"✅ Updated {len(res.data)} agents.")
    for p in res.data:
        print(f"- {p['name']}: {p['type']}")

if __name__ == "__main__":
    update_agents()
