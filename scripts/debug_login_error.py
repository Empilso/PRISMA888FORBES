
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Missing credentials")
    exit(1)

supabase: Client = create_client(url, key)

EMAIL = "admin@prisma888.com"
PASSWORD = "Admin@2026!"
USER_ID = "1cab2345-7287-488b-8406-10ad200e7c6b" # From create_super_admin output

print(f"--- DEBUGGING LOGIN FOR: {EMAIL} (ID: {USER_ID}) ---")

try:
    # 1. Get User Details directly by ID
    try:
        user = supabase.auth.admin.get_user_by_id(USER_ID).user
    except Exception as e:
        print(f"❌ User Lookup Failed: {e}")
        # Fallback to creating if really gone (should not happen)
        exit(1)
    
    print(f"✅ User Found: {user.email}")
    print(f"   Confirmed: {user.email_confirmed_at}")
    print(f"   Last Sign In: {user.last_sign_in_at}")
    print(f"   Banned: {user.banned_until}")

    # 2. Attempt Login (Server-Side)
    print(f"\n🔄 Attempting server-side login with password: '{PASSWORD}'")
    try:
        session = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
        if session.user:
            print("✅ LOGIN SUCCESSFUL! Credentials are correct.")
        else:
            print("❌ Login failed (No session returned).")
    except Exception as login_err:
        print(f"❌ Login Failed with Error: {login_err}")

        # 3. If failed, Try Resetting to Simpler Password
        NEW_PASS = "PrismaAdmin123" # Simpler, no special chars
        print(f"\n⚠️ Login failed. Resetting password to simpler: '{NEW_PASS}'")
        supabase.auth.admin.update_user_by_id(USER_ID, {"password": NEW_PASS})
        print("✅ Password updated.")
        
        # Retry
        print(f"🔄 Retrying login with '{NEW_PASS}'...")
        try:
            session = supabase.auth.sign_in_with_password({"email": EMAIL, "password": NEW_PASS})
            if session.user:
                print("✅ LOGIN SUCCESSFUL with NEW password!")
                print(f"   Token: {session.session.access_token[:20]}...")
            else:
                print("❌ Still failing.")
        except Exception as retry_err:
             print(f"❌ Retry Failed: {retry_err}")

except Exception as e:
    print(f"❌ General Error: {e}")
