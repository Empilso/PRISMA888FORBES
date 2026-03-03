import os
from supabase import create_client
from dotenv import load_dotenv

# Load frontend env since it has the keys usually
load_dotenv("/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/frontend/.env")

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Env missing")
    exit(1)

supabase = create_client(url, key)

try:
    res = supabase.table("tasks").select("id, title, status, campaign_id").limit(5).execute()
    print("Tasks sample:")
    for t in res.data:
        print(f"ID: {t['id']} | Campaign: {t['campaign_id']} | Status: {t['status']}")
except Exception as e:
    print(f"Error: {e}")
