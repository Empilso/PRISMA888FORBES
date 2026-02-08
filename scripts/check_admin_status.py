
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

print(f"--- CHECKING USER: {EMAIL} ---")

try:
    # 1. List users to find admin
    users = supabase.auth.admin.list_users()
    user = next((u for u in users if u.email == EMAIL), None)

    if not user:
        print("❌ User NOT FOUND in Auth!")
        print("Attempting to create...")
        attributes = {
            "email": EMAIL,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {"role": "super_admin", "full_name": "Admin Prisma"}
        }
        user = supabase.auth.admin.create_user(attributes)
        print(f"✅ User created with ID: {user.user.id}")
    else:
        print(f"✅ User FOUND: {user.id}")
        print(f"   Confirmed: {user.email_confirmed_at}")
        
        # 2. Force Password Reset
        print(f"🔄 Resetting password to: {PASSWORD}")
        supabase.auth.admin.update_user_by_id(
            user.id, 
            {"password": PASSWORD, "user_metadata": {"role": "super_admin"}}
        )
        print("✅ Password updated.")

except Exception as e:
    print(f"❌ Error: {e}")
