
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

# Specific target from investigation
TARGET_EMAIL = "pivetta@prisma888.com"

print(f"--- CLEANING UP ORPHAN: {TARGET_EMAIL} ---")

try:
    # 1. Find User
    users = supabase.auth.admin.list_users()
    target_user = next((u for u in users if u.email == TARGET_EMAIL), None)

    if not target_user:
        print(f"✅ User {TARGET_EMAIL} not found (already clean).")
    else:
        print(f"⚠️ Found user: {target_user.id}")
        
        # 2. Delete User
        # This will cascade delete from profiles if it existed (it doesn't), 
        # and allow recreating it properly.
        print("🗑️ Deleting user from Auth...")
        supabase.auth.admin.delete_user(target_user.id)
        print("✅ User deleted successfully.")

except Exception as e:
    print(f"❌ Error: {e}")
