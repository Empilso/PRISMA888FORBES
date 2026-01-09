
import os
import sys
from supabase import create_client
from dotenv import load_dotenv
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Supabase credentials missing!")
        return None
    return create_client(url, key)

def check_votorantim():
    supabase = get_supabase()
    if not supabase:
        return

    print("\n--- Checking for City: Votorantim ---")
    
    try:
        # Search for Votorantim
        res = supabase.table("cities").select("*").ilike("name", "%Votorantim%").execute()
        
        if not res.data:
            print("❌ City 'Votorantim' not found in database.")
            return

        print(f"✅ Found {len(res.data)} record(s):\n")
        
        for city in res.data:
            print(json.dumps(city, indent=4, ensure_ascii=False))
            
            # Specific analysis of codes
            print("\nAnalysis:")
            print(f"  - IBGE Code: {city.get('ibge_code', 'MISSING')}")
            print(f"  - TSE ID: {city.get('tse_id', 'MISSING')}")
            print(f"  - TSE Code: {city.get('tse_code', 'MISSING')}")
            
    except Exception as e:
        print(f"❌ Error querying database: {e}")

if __name__ == "__main__":
    check_votorantim()
