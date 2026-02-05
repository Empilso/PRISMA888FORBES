import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def fetch_recent_logs():
    print("🔍 Fetching Recent Crew Logs...")
    supabase = get_supabase_client()
    
    try:
        # Fetch last 20 logs
        res = supabase.table("crew_run_logs") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()
            
        if not res.data:
            print("❌ No logs found.")
            return

        print(f"✅ Found {len(res.data)} logs.")
        for log in res.data:
            print(f"[{log['created_at']}] {log['agent_name']} ({log['event_type']}): {log['message']}")
            if log.get('event_type') == 'error':
                 print(f"   PAYLOAD: {log.get('payload')}")
                 
    except Exception as e:
        print(f"❌ Error fetching logs: {e}")

if __name__ == "__main__":
    fetch_recent_logs()
