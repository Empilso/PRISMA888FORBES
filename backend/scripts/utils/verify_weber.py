import os
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def verify_weber():
    print("🔎 Verifying Weber Manga...")
    res = supabase.table("politicians").select("*").ilike("name", "%Weber Manga%").execute()
    
    if not res.data:
        print("❌ Weber Manga NOT FOUND!")
        return

        print(f"✅ Found: {p['name']} (ID: {p['id']})")
        print(f"   - Tipo: {p.get('tipo')}")
        print(f"   - Cargo: {p.get('cargo')}")
        
        # Check Mandate
        mandates = supabase.table("mandates").select("*").eq("politician_id", p['id']).eq("is_active", True).execute()
        if mandates.data:
            print(f"   ✅ Active Mandate Found: {mandates.data[0]['office_name']} ({mandates.data[0]['start_date']}-{mandates.data[0]['end_date']})")
        else:
            print(f"   ❌ NO ACTIVE MANDATE FOUND!")
        
verify_weber()
