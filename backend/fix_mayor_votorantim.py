import os
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fix_mayors():
    print("🔎 Fixing Votorantim Mayor Conflict...")
    
    # 1. Get IDs
    city = supabase.table("cities").select("id").ilike("name", "Votorantim").single().execute()
    city_id = city.data["id"]
    
    office = supabase.table("offices").select("id").ilike("name", "Prefeito").single().execute()
    office_id_prefeito = office.data["id"]
    
    print(f"City ID: {city_id}")
    print(f"Office ID Need: {office_id_prefeito}")

    # 2. Find ALL active mayors in Votorantim
    res = supabase.table("mandates") \
        .select("id, politician_id, is_active, politician:politicians(name)") \
        .eq("city_id", city_id) \
        .eq("office_id", office_id_prefeito) \
        .eq("is_active", True) \
        .execute()
        
    print(f"Found {len(res.data)} active mayors.")
    
    weber_found = False
    
    for m in res.data:
        p_name = m["politician"]["name"]
        print(f" - Active Mayor: {p_name} (ID: {m['politician_id']})")
        
        if "Weber Manga" in p_name:
            weber_found = True
            print("   ✅ Valid Mayor.")
        else:
            print(f"   ❌ INVALID Mayor. Deactivating mandate {m['id']}...")
            supabase.table("mandates").update({"is_active": False}).eq("id", m["id"]).execute()
            print("   ✅ Deactivated.")

    # 3. If Weber not active, activate or create
    if not weber_found:
        print("⚠️ Weber Manga is NOT active. Finding him...")
        weber = supabase.table("politicians").select("id").ilike("name", "%Weber Manga%").single().execute()
        
        if weber.data:
            wid = weber.data["id"]
            # Check if he has inactive mandate
            m_res = supabase.table("mandates").select("id").eq("politician_id", wid).eq("city_id", city_id).eq("office_id", office_id_prefeito).execute()
            
            if m_res.data:
                mid = m_res.data[0]["id"]
                print(f"   Found inactive mandate {mid}. Reactivating...")
                supabase.table("mandates").update({"is_active": True}).eq("id", mid).execute()
            else:
                print("   Creating NEW active mandate for Weber...")
                supabase.table("mandates").insert({
                    "politician_id": wid,
                    "city_id": city_id,
                    "office_id": office_id_prefeito,
                    "is_active": True,
                    "start_date": "2025-01-01",
                    "end_date": "2028-12-31"
                }).execute()
            print("✅ Weber Manga set as active Mayor.")
        else:
            print("❌ CRITICAL: Weber Manga politician record not found.")

fix_mayors()
