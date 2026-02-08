
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

print(f"--- DEBUGGING AUTH FOR: {EMAIL} ---")

try:
    # 1. Check User Status
    users = supabase.auth.admin.list_users()
    target_user = next((u for u in users if u.email == EMAIL), None)

    if not target_user:
        print("❌ User not found in Auth!")
    else:
        print(f"✅ User found: {target_user.id}")
        print(f"   Confirmed At: {target_user.email_confirmed_at}")
        print(f"   Last Sign In: {target_user.last_sign_in_at}")
        print(f"   Role: {target_user.role}")
        
        if not target_user.email_confirmed_at:
            print("⚠️ WARNING: Email NOT confirmed! Attempting manual confirmation...")
            # If not confirmed, confirm it
            supabase.auth.admin.update_user_by_id(target_user.id, {"email_confirm": True}) # This method signature might vary, usually attributes are flat or in attributes dict
            # Actually admin.update_user_by_id(uid, attributes={ "email_confirm": True }) ??
            # The library usually exposes update_user_by_id(uid, attributes)
            # Let's try standard approach or use the one that definitely works: 
            # supabase.table('auth.users').update... NO, can't touch auth schemas directly via client easily.
            # let's try confirm via admin api
            # But earlier script used 'email_confirm': True in create and it worked?
            pass

    # 2. Test Login (Simulate Client)
    # We need a CLIENT (anon key) usually for sign_in, but Service Key works too for some ops, 
    # BUT sign_in_with_password is for Client Side auth mostly.
    # Let's try finding the ANON KEY to simulate exactly like frontend.
    
    anon_key = os.getenv("SUPABASE_ANON_KEY") # Check if it's in .env (backend/.env usually has it?)
    # If not in backend/.env, I might fail here.
    # Let's try with service role key first, sometimes it allows.
    
    print("\n--- ATTEMPTING LOGIN via Python ---")
    try:
        session = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
        print("✅ Login SUCCESSFUL!")
        print(f"   Access Token: {session.session.access_token[:20]}...")
    except Exception as e:
        print(f"❌ Login FAILED: {e}")

except Exception as e:
    print(f"❌ Error: {e}")
