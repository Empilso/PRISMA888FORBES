import os
import sys
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Supabase credentials not found")
        sys.exit(1)
    return create_client(url, key)

def debug_save_strategy():
    print("🔍 Testing Strategy Save (Service Role)...")
    supabase = get_supabase_client()
    
    # 1. Get a valid campaign and run to link to
    try:
        camp_res = supabase.table("campaigns").select("id").limit(1).execute()
        if not camp_res.data:
            print("❌ No campaigns found to test with.")
            return
        campaign_id = camp_res.data[0]["id"]
        
        # Get or create a run
        run_res = supabase.table("analysis_runs").select("id").eq("campaign_id", campaign_id).limit(1).execute()
        if not run_res.data:
            print("creating temp run...")
            run_res = supabase.table("analysis_runs").insert({
                "campaign_id": campaign_id,
                "persona_name": "debug",
                "status": "completed"
            }).execute()
        
        run_id = run_res.data[0]["id"]
        print(f"📦 Using Campaign: {campaign_id}")
        print(f"📦 Using Run: {run_id}")
        
    except Exception as e:
        print(f"❌ Error getting context: {e}")
        return

    # 2. Try to insert a strategy
    try:
        strategy_payload = {
            "campaign_id": campaign_id,
            "run_id": run_id,
            "title": "DEBUG STRATEGY 2026",
            "description": "This is a test strategy inserted by debug script.",
            "pillar": "Debug Pillar",
            "phase": "campanha_rua",
            "status": "suggested",
            "examples": ["Exemplo 1", "Exemplo 2"]
        }
        
        print("📤 Attempting insert...")
        result = supabase.table("strategies").insert(strategy_payload).execute()
        
        if result.data:
            print(f"✅ Success! Strategy ID: {result.data[0]['id']}")
        else:
            print("⚠️ Insert executed but no data returned (and no error raised?)")
            
    except Exception as e:
        print(f"❌ Failed to insert strategy: {e}")

if __name__ == "__main__":
    debug_save_strategy()
