
import os
from supabase import create_client
from dotenv import load_dotenv

# Load env vars manually
load_dotenv("backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {url}")
# print(f"KEY: {key}") # Don't print secret

if not url or not key:
    print("❌ Missing credentials")
    exit(1)

try:
    print("Connecting to Supabase...")
    supabase = create_client(url, key)
    
    print("Testing connection (tasks query)...")
    # Simulate list_tasks query
    campaign_id = "camp_123" # Mock or Real
    
    # Just list 1 task to see if valid
    res = supabase.table("tasks").select("*").limit(1).execute()
    print(f"✅ Success! Found {len(res.data)} tasks.")
    
except Exception as e:
    print(f"❌ Failed: {e}")
