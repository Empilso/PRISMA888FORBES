import os
import sys
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def list_recent_strategies():
    print("🔍 Checking for recent strategies...")
    supabase = get_supabase_client()
    
    try:
        # Get latest run
        res = supabase.table("analysis_runs").select("id, created_at, status").order("created_at", desc=True).limit(1).execute()
        if not res.data:
            print("❌ No runs found.")
            return

        latest_run = res.data[0]
        print(f"📦 Latest Run: {latest_run['id']} ({latest_run['status']}) at {latest_run['created_at']}")
        
        # Get strategies for this run
        strat_res = supabase.table("strategies").select("title, pillar").eq("run_id", latest_run['id']).execute()
        
        if strat_res.data:
            print(f"✅ Found {len(strat_res.data)} strategies linked to this run:")
            for s in strat_res.data:
                print(f"   - {s['title']} ({s['pillar']})")
        else:
            print("❌ No strategies found for this run.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    list_recent_strategies()
