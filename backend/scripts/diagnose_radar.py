
import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Add parent directory to path to allow imports if needed, though we check main.py textually
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Supabase credentials missing!")
        return None
    return create_client(url, key)

def check_tables(supabase):
    print("\n--- 1. Database Check ---")
    
    # Check offices
    try:
        res = supabase.table("offices").select("*", count="exact").execute()
        count = len(res.data)
        print(f"[{'✅' if count > 0 else '⚠️'}] Table 'offices': {count} records found.")
    except Exception as e:
        print(f"[❌] Table 'offices' check failed: {e}")

    # Check agents
    try:
        res = supabase.table("agents").select("name, role").ilike("name", "%radar%").execute()
        agents = res.data
        if agents:
            print(f"[✅] Radar Agents Found ({len(agents)}):")
            for a in agents:
                print(f"    - {a['name']} ({a['role']})")
        else:
            print("[⚠️] No agents found with 'radar' in name.")
    except Exception as e:
        print(f"[❌] Table 'agents' check failed: {e}")

    # Check promises table existence (simple query)
    try:
        supabase.table("promises").select("id").limit(1).execute()
        print("[✅] Table 'promises' exists.")
    except Exception as e:
        print(f"[❌] Table 'promises' check failed (might not exist): {e}")

def check_api_routes():
    print("\n--- 2. API Routes Check (Static Analysis) ---")
    main_py_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "main.py")
    
    if not os.path.exists(main_py_path):
        print(f"[❌] Could not find {main_py_path}")
        return

    with open(main_py_path, "r") as f:
        content = f.read()

    routes_to_check = [
        ("src.api.radar_premium", "radar_premium_router"),
        ("src.api.radar_promises", "radar_promises_router"),
        ("app.include_router(radar_premium_router)", "Registered radar_premium_router"),
        ("app.include_router(radar_promises_router)", "Registered radar_promises_router")
    ]

    for term, label in routes_to_check:
        if term in content:
            print(f"[✅] {label} found in main.py")
        else:
            print(f"[⚠️] {label} NOT found in main.py")

def main():
    print("🕵️‍♂️ Starting Radar Premium Smoke Test...\n")
    
    supabase = get_supabase()
    if supabase:
        check_tables(supabase)
    
    check_api_routes()
    print("\n--- Diagnosis Complete ---")

if __name__ == "__main__":
    main()
