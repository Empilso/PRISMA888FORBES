import os
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_docs():
    print("🔎 Checking documents for Weber Manga...")
    
    # 1. Get Politician ID
    pol = supabase.table("politicians").select("id, name").ilike("name", "%Weber Manga%").single().execute()
    if not pol.data:
        print("❌ Politician not found.")
        return
    
    p_id = pol.data["id"]
    print(f"✅ Politician: {pol.data['name']} ({p_id})")

    # 2. Check Documents
    docs = supabase.table("documents") \
        .select("id, filename, file_url, content_text") \
        .eq("person_id", p_id) \
        .eq("doc_type", "government_plan") \
        .execute()
        
    if not docs.data:
        print("❌ No 'government_plan' document found for this politician.")
        # Check standard campaign docs?
        return

    for d in docs.data:
        print(f"📄 Found Document: {d['filename']}")
        print(f"   ID: {d['id']}")
        print(f"   URL: {d['file_url']}")
        txt_len = len(d['content_text']) if d['content_text'] else 0
        print(f"   Text Length: {txt_len}")
        
        if not d['file_url']:
            print("   ⚠️ URL IS EMPTY!")

check_docs()
