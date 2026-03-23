import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def check_personas():
    names = ["radar-extrator-promessas", "radar-fiscal-verbas"]
    print(f"🔎 Checking for personas: {names}")
    
    response = supabase.table("personas").select("*").in_("name", names).execute()
    data = response.data
    
    found_names = [p['name'] for p in data]
    print(f"✅ Found {len(data)} personas: {found_names}")
    
    for p in data:
        print(f"\n--- PERSONA: {p['name']} ---")
        print(f"ID: {p['id']}")
        print(f"Type: {p.get('type')}")
        print(f"Model: {p.get('llm_model')}")
        
        config = p.get('config', {})
        print("Config Head:")
        print(json.dumps(config, indent=2)[:500] + "...") # Print first 500 chars

if __name__ == "__main__":
    check_personas()
