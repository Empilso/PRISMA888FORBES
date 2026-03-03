
import os
import sys
from supabase import create_client
from dotenv import load_dotenv
import re

# Load env same as backend
env_path = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/.env"
load_dotenv(env_path)

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(f"❌ Missing credentials. URL={url is not None}, KEY={key is not None}")
        sys.exit(1)
    return create_client(url, key)

def test_create_org_logic():
    print("🧪 Testing Organization Creation Logic...")
    supabase = get_supabase_client()
    
    org_name = "Test Organization 500"
    org_type = "party"
    org_settings = {"colors": {"primary": "#000000", "accent": "#ffffff"}}
    
    # Logic from organizations.py
    slug = org_name.lower().strip().replace(" ", "-")
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    print(f"Slug generated: {slug}")
    
    org_data = {
        "name": org_name,
        "slug": slug,
        "type": org_type,
        "settings": org_settings
    }
    
    # Check if exists to clean up
    existing = supabase.table("organizations").select("id").eq("slug", slug).execute()
    if existing.data:
        print(f"⚠️ Org {slug} already exists, deleting...")
        supabase.table("organizations").delete().eq("slug", slug).execute()
        
    print("Trying insert...")
    try:
        result = supabase.table("organizations").insert(org_data).execute()
        if result.data:
            print("✅ Insert Success!")
            print(result.data[0])
        else:
            print("❌ Insert returned no data (but no exception)")
    except Exception as e:
        print(f"❌ Exception during insert: {e}")

if __name__ == "__main__":
    test_create_org_logic()
