
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Need to use 'gotrue' client or admin api. 
# The python supabase client exposes 'auth' which wraps GoTrue.
# admin operations require service_role key.

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def list_auth_users():
    print("🔍 Listing Auth Users...")
    try:
        # Supabase Python client might not expose list_users directly via 'auth' prop easily 
        # without admin privilege explicit call.
        # But let's try via the admin api if available or raw request.
        
        # Recent supabase-py versions have auth.admin.list_users()
        users = supabase.auth.admin.list_users()
        if users:    
            print(f"Found {len(users)} users.")
            for u in users:
                print(f"ID: {u.id} | Email: {u.email} | Meta: {u.user_metadata} | Banned: {u.banned_until} | Confirmed: {u.email_confirmed_at}")
        else:
            print("No users found.")
            
    except Exception as e:
        print(f"Error listing users: {e}")
        # Fallback using requests if SDK fails
        try:
            import requests
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
            url = f"{SUPABASE_URL}/auth/v1/admin/users"
            r = requests.get(url, headers=headers)
            if r.status_code == 200:
                us = r.json().get("users", [])
                print(f"\n[Raw API] Found {len(us)} users.")
                for u in us:
                    print(f"ID: {u['id']} | Email: {u['email']} | Meta: {u.get('user_metadata')}")
            else:
                print(f"Raw API Error: {r.text}")
        except Exception as e2:
            print(f"Raw API Exception: {e2}")

if __name__ == "__main__":
    list_auth_users()
