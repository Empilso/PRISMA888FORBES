import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") # Use service key if available for admin tasks

if not SUPABASE_KEY:
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
print(f"DEBUG: Loading .env from {os.getcwd()}")
print(f"DEBUG: Found URL: {bool(SUPABASE_URL)}")
print(f"DEBUG: Found KEY: {bool(SUPABASE_KEY)}")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    # Try hardcoding path
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    print(f"DEBUG: Trying explicit path: {env_path}")
    load_dotenv(env_path)
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    print(f"DEBUG: Retry URL: {bool(SUPABASE_URL)}")
    print(f"DEBUG: Retry KEY: {bool(SUPABASE_KEY)}")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fix_weber():
    print("🔎 Searching for Weber Manga...")
    
    # 1. Update Cargo to Prefeito
    res = supabase.table("politicians").select("*").ilike("name", "%Weber%Manga%").execute()
    
    if not res.data:
        print("❌ Weber Manga not found in politicians table.")
        return

    weber = res.data[0]
    pid = weber['id']
    name = weber['name']
    cargo = weber['cargo']
    city_id = weber['city_id']
    
    print(f"👤 Found: {name} | Cargo: {cargo} | ID: {pid}")

    if cargo != 'Prefeito':
        print(f"🔄 Updating cargo from {cargo} to 'Prefeito'...")
        supabase.table("politicians").update({"cargo": "Prefeito"}).eq("id", pid).execute()
        print("✅ Cargo updated.")
    
    # 2. Check Mandate
    # Check if he has a mandate
    mandates = supabase.table("mandates").select("*, offices(title)").eq("politician_id", pid).execute()
    
    has_mayor_mandate = False
    if mandates.data:
        for m in mandates.data:
            office_title = m['offices']['title'] if 'offices' in m and m['offices'] else "Unknown"
            print(f"📋 Existing Mandate: {office_title} (Active: {m['is_active']})")
            if office_title == 'Prefeito':
                has_mayor_mandate = True

    if not has_mayor_mandate:
        print("⚠️ No Mayor mandate found. Creating one...")
        
        # Get Office ID for Prefeito
        offices = supabase.table("offices").select("id").eq("title", "Prefeito").execute()
        if not offices.data:
            print("❌ Office 'Prefeito' not found")
            return
            
        oid = offices.data[0]['id']
        
        new_mandate = {
            "politician_id": pid,
            "office_id": oid,
            "city_id": city_id,
            "is_active": True
        }
        
        supabase.table("mandates").insert(new_mandate).execute()
        print(f"✅ Mandate created.")

    # 3. Check Legislative Support (Remove if exists, he is Mayor)
    # legislative_support table might not be accessible if RLS blocks logic, but let's try
    try:
        support = supabase.table("legislative_support").select("id").eq("politician_id", pid).execute()
        if support.data:
            print("⚠️ Found in legislative_support. This is wrong for a Mayor. Removing...")
            supabase.table("legislative_support").delete().eq("politician_id", pid).execute()
            print("✅ Removed from legislative_support.")
    except Exception as e:
        print(f"⚠️ Could not check legislative_support: {e}")

if __name__ == "__main__":
    fix_weber()
