import sys
import os
import asyncio
from typing import List, Dict
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Add parent dir to path to import src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.tse_service import TSEService
from src.api.tse import get_supabase
from supabase import create_client

def generate_slug(name: str):
    return name.lower().replace(" ", "-").replace("á", "a").replace("ã", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ç", "c")

async def import_chamber(city_name="Votorantim", uf="SP", year="2024"):
    service = TSEService()
    supabase = get_supabase()
    
    print(f"=== Importing City Chamber for {city_name} ({year}) ===")
    
    # 1. Get City ID from Supabase
    city_res = supabase.table("cities").select("*").ilike("name", f"%{city_name}%").eq("state", uf).execute()
    if not city_res.data:
        print(f"City {city_name} not found in database.")
        return
    city = city_res.data[0]
    city_id = city["id"]
    print(f"Found City: {city['name']} (ID: {city_id})")

    # 2. Get TSE Code
    tse_code = service.get_city_code(uf, city_name, year)
    if not tse_code:
        print("TSE Code not found.")
        return
        
    # 3. Fetch Vereadores (13)
    print("Fetching candidates from TSE...")
    candidates = service.get_candidates(tse_code, cargo_code="13", year=year)
    
    # 4. Filter Elected
    elected = [c for c in candidates if c.get("resultado") in ["Eleito", "Eleito por QP", "Eleito por média"]]
    print(f"Found {len(elected)} elected councilors.")
    
    # 5. Save to Supabase
    success_count = 0
    for cand in elected:
        name = cand["nome_urna"]
        partido = cand["partido"]
        slug = generate_slug(name)
        
        print(f"Processing {name} ({partido})...")
        
        # Check duplicate by slug
        existing = supabase.table("politicians").select("id").eq("slug", slug).execute()
        if existing.data:
            print(f"  - Already exists. Skipping.")
            continue
            
        payload = {
            "name": name,
            "city_id": city_id,
            "tipo": "vereador",
            "partido": partido,
            "slug": slug,
            "campaign_id": None # No campaign initially
        }
        
        try:
            res = supabase.table("politicians").insert(payload).execute()
            if res.data:
                print(f"  + Imported successfully.")
                success_count += 1
        except Exception as e:
            print(f"  x Error importing: {e}")

    print(f"=== Finished. Imported {success_count} new councilors. ===")

if __name__ == "__main__":
    asyncio.run(import_chamber())
