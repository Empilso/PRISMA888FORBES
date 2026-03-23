import os
import requests
import tempfile
from dotenv import load_dotenv
from supabase import create_client, Client
from io import BytesIO
try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        PdfReader = None

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def debug_pdf():
    print("🔎 Finding Weber Manga Campaign...")
    # 1. Find Politician
    pol = supabase.table("politicians").select("id, name").ilike("name", "%Weber Manga%").execute()
    if not pol.data:
        print("❌ Weber Manga not found in politicians.")
        return
    
    p_id = pol.data[0]["id"]
    print(f"✅ Politician: {pol.data[0]['name']} ({p_id})")

    # 2. Find Campaign
    # Assuming active campaign or most recent
    camp = supabase.table("campaigns").select("id, proposal_url").eq("politician_id", p_id).execute()
    
    if not camp.data:
        print("❌ No campaign found for Weber Manga.")
        return

    # Use the first one or the one with a proposal_url
    target_camp = None
    for c in camp.data:
        if c.get("proposal_url"):
            target_camp = c
            break
            
    if not target_camp:
        print("❌ No campaign has a 'proposal_url'.")
        print("Raw Campaigns Data:", camp.data)
        return

    campaign_id = target_camp["id"]
    url = target_camp["proposal_url"]
    print(f"✅ Campaign ID: {campaign_id}")
    print(f"🔗 Proposal URL: {url}")

    if not url:
        print("⚠️ URL is empty/None.")
        return

    # 3. Test Download
    print("⬇️ Attempting download...")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=15)
        print(f"HTTP Status: {response.status_code}")
        response.raise_for_status()
        content = response.content
        print(f"✅ Downloaded {len(content)} bytes.")
    except Exception as e:
        print(f"❌ Download Failed: {e}")
        return

    # 4. Test Extraction (Basic)
    print("📖 Attempting basic PDF Read...")
    if PdfReader:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
            reader = PdfReader(tmp_path)
            num_pages = len(reader.pages)
            print(f"✅ PDF Valid. Pages: {num_pages}")
            
            text = ""
            for i in range(min(3, num_pages)): # First 3 pages
                page_text = reader.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if not text.strip():
                print("⚠️ WARNING: No text extracted. Might be an IMAGE PDF (Scanned).")
            else:
                print(f"✅ Extracted Text Sample (first 200 chars):\n{text[:200]}")
                
            os.remove(tmp_path)
        except Exception as e:
            print(f"❌ PDF Parsing Failed: {e}")
    else:
        print("⚠️ pypdf/PyPDF2 not installed in this environment check. Skipping extract test.")

if __name__ == "__main__":
    debug_pdf()
