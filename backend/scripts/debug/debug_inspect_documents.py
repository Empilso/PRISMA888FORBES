
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_documents():
    print("🔍 Inspecting 'documents' table...")
    try:
        # Get schema/keys
        resp = supabase.table("documents").select("*").limit(1).execute()
        if resp.data:
            print(f"   Keys: {list(resp.data[0].keys())}")
            print(f"   Sample: {resp.data[0]}")
        else:
            print("   Table is empty (or no permission).")

        # Check specifically for Weber Manga's document (if we can find by filename or recent)
        print("\n🔍 Searching for 'PlanoDeGoverno' docs...")
        resp2 = supabase.table("documents").select("*").ilike("filename", "%Plano%").limit(5).execute()
        for d in resp2.data:
            print(f"   ID: {d.get('id')} | Filename: {d.get('filename')} | URL Key: {d.get('file_url') if 'file_url' in d else 'KEY_NOT_FOUND'} | URL val: {d.get('url') if 'url' in d else 'N/A'}")

    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    inspect_documents()
