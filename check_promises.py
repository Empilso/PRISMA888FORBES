
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

# Weber Manga's politician_id from the console logs
manga_id = "4692b8c3-b2d8-4671-ace1-3b86f93811b5"

# Check promises for this politician
promises = supabase.table("promises").select("id, resumo_promessa, politico_id, source_type").eq("politico_id", manga_id).execute()
print(f"✅ Promessas de Weber Manga (politico_id={manga_id}): {len(promises.data)}")
for p in promises.data[:5]:
    print(f"  - {p['resumo_promessa'][:60]}... (source: {p.get('source_type', 'N/A')})")

# Check if Pivetta has different promises
pivetta = supabase.table("politicians").select("id").ilike("name", "%Pivetta%").execute()
if pivetta.data:
    pivetta_id = pivetta.data[0]["id"]
    pivetta_promises = supabase.table("promises").select("id, resumo_promessa").eq("politico_id", pivetta_id).execute()
    print(f"\n📋 Promessas de Pivetta (politico_id={pivetta_id}): {len(pivetta_promises.data)}")
    for p in pivetta_promises.data[:3]:
        print(f"  - {p['resumo_promessa'][:60]}...")
