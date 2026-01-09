
import os
import sys
from supabase import create_client
from dotenv import load_dotenv
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def check_table_info():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)

    print("--- Inspecting 'cities' via Supabase Client ---")
    try:
        # Get one record
        res = supabase.table("cities").select("*").limit(1).execute()
        if res.data:
            print("✅ 'cities' table access OK.")
            print("Row keys:", list(res.data[0].keys()))
            
            # Check for tse_id
            if "tse_id" in res.data[0]:
                print("✅ Column 'tse_id' ALREADY EXISTS!")
            else:
                print("❌ Column 'tse_id' is MISSING.")
        else:
            print("⚠️ 'cities' table access OK but empty.")
            
    except Exception as e:
        print(f"❌ Error via Client: {e}")

if __name__ == "__main__":
    check_table_info()
