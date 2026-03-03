
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.tse_service import TSEService

load_dotenv()

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def test_votorantim_integration():
    print("🚀 Starting Votorantim Integration Test...")
    
    supabase = get_supabase()
    service = TSEService()
    
    city_name = "Votorantim"
    uf = "SP"
    
    # 1. Fetch TSE Code
    print(f"📡 Fetching TSE Code for {city_name} ({uf})...")
    code = service.get_city_code(uf, city_name)
    
    if not code:
        print("❌ Failed to fetch city code.")
        return

    print(f"✅ Found TSE Code: {code}")
    
    # 2. Update Database
    print(f"💾 Updating database 'cities' table...")
    try:
        # Find ID of Votorantim
        res = supabase.table("cities").select("id").eq("name", city_name).eq("state", uf).execute()
        if res.data:
            city_id = res.data[0]["id"]
            supabase.table("cities").update({"tse_id": code}).eq("id", city_id).execute()
            print(f"✅ Database updated for ID: {city_id}")
        else:
            print("⚠️ City not found in DB to update.")
    except Exception as e:
        print(f"❌ Database error: {e}")

    # 3. Fetch Candidates (Prefeito)
    print("📡 Fetching Candidates (Mayor)...")
    candidates = service.get_candidates(code, "11")
    
    print("\n🏆 Candidates Found:")
    for i, c in enumerate(candidates[:5]):
        print(f"{i+1}. {c['nome_urna']} ({c['partido']}) - {c['status']}")
        
    print(f"\nTotal Candidates: {len(candidates)}")

if __name__ == "__main__":
    test_votorantim_integration()
