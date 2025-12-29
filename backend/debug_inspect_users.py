
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_user_tables():
    print("🔍 Inspecting potential user/profile tables...")
    
    # Try 'profiles'
    try:
        print("\n--- profiles ---")
        resp = supabase.table("profiles").select("*").limit(1).execute()
        if resp.data:
            print(f"Keys: {list(resp.data[0].keys())}")
        else:
            print("Table empty or not found.")
    except Exception as e:
        print(f"Error accessing profiles: {e}")

    # Try 'users' (public)
    try:
        print("\n--- users (public) ---")
        resp = supabase.table("users").select("*").limit(1).execute()
        if resp.data:
            print(f"Keys: {list(resp.data[0].keys())}")
        else:
            print("Table empty or not found.")
    except Exception as e:
        print(f"Error accessing users: {e}")

    # Check for foreign keys in politicians again (maybe I missed something)
    try:
        print("\n--- politicians constraints ---")
        # Difficult to check constraints via API directly without specific SQL function
        # But we can check if any column looks like a UUID for user
        resp = supabase.table("politicians").select("*").limit(1).execute()
        if resp.data:
             print(f"Politician Data: {resp.data[0]}")
    except:
        pass

if __name__ == "__main__":
    inspect_user_tables()
