import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Add backend to path to find .env if needed, though load_dotenv should handle it
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Try to load .env from backend directory first
env_path = os.path.join(os.getcwd(), 'backend', '.env')
if os.path.exists(env_path):
    print(f"Loading .env from {env_path}")
    load_dotenv(env_path)
else:
    load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Supabase credentials not found in env")
        sys.exit(1)
    return create_client(url, key)

def run_migration():
    print("🚀 Starting Migration: map_notes table...")
    supabase = get_supabase_client()
    
    # Read SQL file
    try:
        with open("create_map_notes_table.sql", "r") as f:
            sql_content = f.read()
    except FileNotFoundError:
        print("❌ SQL file 'create_map_notes_table.sql' not found.")
        sys.exit(1)

    # Execute SQL using rpc or raw query if library supports it.
    # The python supabase client usually interacts via PostgREST. 
    # Executing raw SQL is tricky without the specific `rpc` function if 'execute_sql' is not exposed.
    # However, sometimes we can use the `postgres` library or `psycopg2` if available.
    # Since we can't install deps, we rely on Supabase-py. 
    # IF supabase-py doesn't have raw sql execution easily, we might look for a pre-existing RPC or 
    # just assume the User handles it.
    
    # BUT, the prompt said "Entregar... SQL". It didn't force me to run it successfully if I can't.
    # Let's try to check if we can simply note that the user needs to run it.
    
    print("\n⚠️  NOTICE: Standard Supabase-py client does not support raw SQL execution without a helper function (RPC).")
    print("⚠️  Please execute the contents of 'create_map_notes_table.sql' in your Supabase SQL Editor.")
    print("\nSQL Content Preview:")
    print(sql_content[:200] + "...")

if __name__ == "__main__":
    run_migration()
