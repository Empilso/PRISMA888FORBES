
import os
import json
import asyncio
from supabase import create_client, Client

# Initialize Supabase Client (Service Role for Setup/Cleanup, Anon for Testing)
url = os.environ.get("SUPABASE_URL")
service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
anon_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not service_key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

# API Clients
admin_client: Client = create_client(url, service_key)
# For anon/auth testing, we would need to sign up a user or use anon key.
# However, without a real user token, we can only test Anon vs Service Role.
anon_client: Client = create_client(url, anon_key) if anon_key else None

async def verify_policies():
    print("--- Verifying RLS Policies for 'tasks' table ---")
    
    # 1. Check if RLS is enabled (via pg_class/pg_policy using Admin RPC if available or just behavior)
    # Since we can't run raw SQL, we infer from behavior.
    
    # Test 1: Service Role Access (Should succeed)
    print("\n[TEST 1] Service Role Access (Admin)")
    try:
        res = admin_client.table("tasks").select("*").limit(1).execute()
        print(f"✅ Success: Retrieved {len(res.data)} tasks.")
    except Exception as e:
        print(f"❌ Failed: {e}")

    # Test 2: Anonymous Access (Should FAIL with empty list or error if RLS is working + no policy)
    # If RLS is ON and no policy for anon exists -> returns [] (empty) usually, or 401.
    # If RLS is OFF -> returns data! (Risk)
    print("\n[TEST 2] Anonymous Access (Anon Key)")
    if anon_client:
        try:
            res = anon_client.table("tasks").select("*").limit(1).execute()
            if len(res.data) > 0:
                 print(f"❌ CRITICAL: Anon user retrieved {len(res.data)} tasks! RLS might be OFF or Open Policy.")
            else:
                 print("✅ Success (Secure): Anon user retrieved 0 tasks (RLS blocking or empty).")
        except Exception as e:
             # 400/401 is actually good here (Access Denied)
             print(f"✅ Success (Secure): Request failed as expected: {e}")
    else:
        print("⚠️ Skipped: No NEXT_PUBLIC_SUPABASE_ANON_KEY found.")

    # Note: We cannot test 'Authenticated' without a valid JWT token.
    # In a real scenario, we would signInWithPassword to get a token.

if __name__ == "__main__":
    asyncio.run(verify_policies())
