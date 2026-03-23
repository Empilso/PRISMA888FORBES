import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Try loading from backend folder
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
CAMPAIGN_ID = "82c06bb9-1cfc-4375-a076-edabbd704b17"

def debug_chamber():
    print(f"🔎 debugging chamber for campaign: {CAMPAIGN_ID}")
    
    try:
        # 1. Get Campaign City
        print("1. Fetching Campaign...")
        camp = supabase.table("campaigns").select("city").eq("id", CAMPAIGN_ID).single().execute()
        if not camp.data:
            print("❌ Campaign not found or empty")
            return
        
        city_name = camp.data["city"]
        print(f"✅ City Name: {city_name}")
        
        # Resolve City ID
        city_res = supabase.table("cities").select("id").ilike("name", city_name).limit(1).execute()
        if not city_res.data:
            print(f"❌ City '{city_name}' not found in cities table")
            return
            
        city_id = city_res.data[0]["id"]
        print(f"✅ City ID resolved: {city_id}")

        # 2. Get Councilors
        print("2. Fetching Councilors...")
        councilors_res = supabase.table("politicians") \
            .select("id, name, partido, slug, foto_url") \
            .eq("city_id", city_id) \
            .ilike("tipo", "%vereador%") \
            .order("name") \
            .execute()
        
        if not councilors_res.data:
            print("⚠️ No councilors found.")
        else:
            print(f"✅ Found {len(councilors_res.data)} councilors.")

        councilors = councilors_res.data
        councilor_ids = [c["id"] for c in councilors]

        # 3. Get Support Status
        print("3. Fetching Support Status...")
        if not councilor_ids:
            print("⚠️ Skipping support fetch (no councilors)")
            return

        support_res = supabase.table("legislative_support") \
            .select("politician_id, status, notes") \
            .eq("campaign_id", CAMPAIGN_ID) \
            .in_("politician_id", councilor_ids) \
            .execute()
        
        print(f"✅ Support records found: {len(support_res.data)}")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_chamber()
