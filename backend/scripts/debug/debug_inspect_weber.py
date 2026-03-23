
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_weber_doc():
    print("🔍 Inspecting Weber Manga Document...")
    # Find politician ID for Weber Manga
    pol_res = supabase.table("politicians").select("id").ilike("name", "%Weber%").single().execute()
    if not pol_res.data:
        print("❌ Weber Manga not found.")
        return
        
    pid = pol_res.data["id"]
    print(f"   Politician ID: {pid}")
    
    # Find document
    doc_res = supabase.table("documents").select("*").eq("person_id", pid).eq("doc_type", "government_plan").execute()
    if doc_res.data:
        d = doc_res.data[0]
        print(f"   Document Found: ID={d['id']}")
        print(f"   Filename: {d.get('filename')}")
        print(f"   File URL: {d.get('file_url')}") # This is likely None
        print(f"   Content Len: {len(d.get('content_text') or '')}")
    else:
        print("❌ No document found for Weber Manga.")

if __name__ == "__main__":
    inspect_weber_doc()
