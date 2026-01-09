
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
import os
from supabase import create_client
from src.services.tse_service import TSEService

router = APIRouter(prefix="/api/tse", tags=["tse"])
tse_service = TSEService()

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

@router.get("/candidates")
async def list_tse_candidates(
    city_id: UUID, 
    cargo: str = "11", # 11=Prefeito, 13=Vereador
    year: str = "2024"
):
    """
    Lista candidatos diretamente da API do TSE.
    Auto-healing: Se a cidade não tiver tse_id, busca e salva automaticamente.
    """
    supabase = get_supabase()
    
    # 1. Get City Data
    city_res = supabase.table("cities").select("*").eq("id", str(city_id)).single().execute()
    if not city_res.data:
        raise HTTPException(status_code=404, detail="City not found")
        
    city = city_res.data
    tse_id = city.get("tse_id")
    
    # 2. Auto-Healing: Find TSE Code if missing
    if not tse_id:
        print(f"⚠️ City {city['name']} missing TSE ID. Searching...")
        tse_id = tse_service.get_city_code(city["state"], city["name"], year=year)
        
        if tse_id:
            # Save it!
            # Note: We might want to store year-specific TSE IDs if they differ, but typically city code is stable.
            # However, if it differs, we might have an issue. Assuming stable city codes for now.
            supabase.table("cities").update({"tse_id": tse_id}).eq("id", str(city_id)).execute()
            print(f"✅ TSE ID {tse_id} saved for {city['name']}")
        else:
            raise HTTPException(status_code=404, detail=f"TSE Code not found for {city['name']}-{city['state']}")
            
    # 3. Fetch Candidates
    candidates = tse_service.get_candidates(tse_id, cargo, year=year)
    
    return {
        "city_name": city["name"],
        "tse_id": tse_id,
        "count": len(candidates),
        "candidates": candidates
    }
