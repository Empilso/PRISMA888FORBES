"""
Cities & Politicians API
Endpoints for managing cities and politicians registration.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
import os
import re
from supabase import create_client

router = APIRouter(prefix="/api", tags=["cities-politicians"])


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


def generate_slug(text: str) -> str:
    """Generate URL-friendly slug from text"""
    slug = text.lower()
    slug = re.sub(r'[áàâã]', 'a', slug)
    slug = re.sub(r'[éèê]', 'e', slug)
    slug = re.sub(r'[íìî]', 'i', slug)
    slug = re.sub(r'[óòôõ]', 'o', slug)
    slug = re.sub(r'[úùû]', 'u', slug)
    slug = re.sub(r'[ç]', 'c', slug)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


# ============ CITY SCHEMAS ============

class CityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=2)
    ibge_code: Optional[str] = None


class CityRead(BaseModel):
    id: UUID
    name: str
    state: str
    ibge_code: Optional[str]
    slug: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ POLITICIAN SCHEMAS ============

class PoliticianCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    city_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    tipo: str = Field(default="prefeito")
    partido: Optional[str] = None
    foto_url: Optional[str] = None


class PoliticianRead(BaseModel):
    id: UUID
    name: str
    city_id: Optional[UUID]
    campaign_id: Optional[UUID]
    tipo: str
    slug: str
    partido: Optional[str]
    foto_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Joined data
    city_name: Optional[str] = None
    city_state: Optional[str] = None

    class Config:
        from_attributes = True


# ============ CITY ENDPOINTS ============

@router.post("/cities", response_model=CityRead)
async def create_city(city: CityCreate):
    """Create a new city"""
    supabase = get_supabase_client()
    
    slug = generate_slug(f"{city.name}-{city.state}")
    
    # Check for duplicate slug
    existing = supabase.table("cities").select("id").eq("slug", slug).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"City with slug '{slug}' already exists")
    
    data = {
        "name": city.name,
        "state": city.state.upper(),
        "ibge_code": city.ibge_code,
        "slug": slug
    }
    
    result = supabase.table("cities").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create city")
    
    return result.data[0]


@router.get("/cities", response_model=List[CityRead])
async def list_cities(
    state: Optional[str] = Query(None, description="Filter by state (UF)"),
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    """List all cities with optional filters"""
    supabase = get_supabase_client()
    
    query = supabase.table("cities").select("*")
    
    if state:
        query = query.eq("state", state.upper())
    
    if search:
        query = query.ilike("name", f"%{search}%")
    
    query = query.order("name").range(offset, offset + limit - 1)
    result = query.execute()
    
    return result.data or []


@router.get("/cities/{city_id}", response_model=CityRead)
async def get_city(city_id: UUID):
    """Get city by ID"""
    supabase = get_supabase_client()
    
    result = supabase.table("cities").select("*").eq("id", str(city_id)).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="City not found")
    
    return result.data


# ============ POLITICIAN ENDPOINTS ============

@router.post("/politicians", response_model=PoliticianRead)
async def create_politician(politician: PoliticianCreate):
    """Create a new politician"""
    supabase = get_supabase_client()
    
    slug = generate_slug(politician.name)
    
    # Make slug unique by appending number if needed
    existing = supabase.table("politicians").select("id").eq("slug", slug).execute()
    if existing.data:
        # Add suffix to make unique
        count = len(existing.data)
        slug = f"{slug}-{count + 1}"
    
    data = {
        "name": politician.name,
        "city_id": str(politician.city_id) if politician.city_id else None,
        "campaign_id": str(politician.campaign_id) if politician.campaign_id else None,
        "tipo": politician.tipo,
        "slug": slug,
        "partido": politician.partido,
        "foto_url": politician.foto_url
    }
    
    result = supabase.table("politicians").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create politician")
    
    p = result.data[0]
    
    # Get city info if available
    city_name = None
    city_state = None
    if p.get("city_id"):
        city_res = supabase.table("cities").select("name, state").eq("id", p["city_id"]).execute()
        if city_res.data:
            city_name = city_res.data[0]["name"]
            city_state = city_res.data[0]["state"]
    
    return PoliticianRead(
        id=p["id"],
        name=p["name"],
        city_id=p.get("city_id"),
        campaign_id=p.get("campaign_id"),
        tipo=p["tipo"],
        slug=p["slug"],
        partido=p.get("partido"),
        foto_url=p.get("foto_url"),
        created_at=p["created_at"],
        updated_at=p["updated_at"],
        city_name=city_name,
        city_state=city_state
    )


@router.get("/politicians", response_model=List[PoliticianRead])
async def list_politicians(
    city_id: Optional[UUID] = Query(None, description="Filter by city"),
    campaign_id: Optional[UUID] = Query(None, description="Filter by campaign"),
    tipo: Optional[str] = Query(None, description="Filter by type"),
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    """List all politicians with optional filters"""
    supabase = get_supabase_client()
    
    query = supabase.table("politicians").select("*")
    
    if city_id:
        query = query.eq("city_id", str(city_id))
    
    if campaign_id:
        query = query.eq("campaign_id", str(campaign_id))
    
    if tipo:
        query = query.eq("tipo", tipo)
    
    if search:
        query = query.ilike("name", f"%{search}%")
    
    query = query.order("name").range(offset, offset + limit - 1)
    result = query.execute()
    
    if not result.data:
        return []
    
    # Fetch city info for all politicians
    city_ids = list(set([p["city_id"] for p in result.data if p.get("city_id")]))
    city_map = {}
    if city_ids:
        cities_res = supabase.table("cities").select("id, name, state").in_("id", city_ids).execute()
        for c in cities_res.data or []:
            city_map[c["id"]] = {"name": c["name"], "state": c["state"]}
    
    politicians = []
    for p in result.data:
        city_info = city_map.get(p.get("city_id"), {})
        politicians.append(PoliticianRead(
            id=p["id"],
            name=p["name"],
            city_id=p.get("city_id"),
            campaign_id=p.get("campaign_id"),
            tipo=p["tipo"],
            slug=p["slug"],
            partido=p.get("partido"),
            foto_url=p.get("foto_url"),
            created_at=p["created_at"],
            updated_at=p["updated_at"],
            city_name=city_info.get("name"),
            city_state=city_info.get("state")
        ))
    
    return politicians


@router.get("/politicians/{politician_id}", response_model=PoliticianRead)
async def get_politician(politician_id: UUID):
    """Get politician by ID"""
    supabase = get_supabase_client()
    
    result = supabase.table("politicians").select("*").eq("id", str(politician_id)).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Politician not found")
    
    p = result.data
    
    # Get city info
    city_name = None
    city_state = None
    if p.get("city_id"):
        city_res = supabase.table("cities").select("name, state").eq("id", p["city_id"]).execute()
        if city_res.data:
            city_name = city_res.data[0]["name"]
            city_state = city_res.data[0]["state"]
    
    return PoliticianRead(
        id=p["id"],
        name=p["name"],
        city_id=p.get("city_id"),
        campaign_id=p.get("campaign_id"),
        tipo=p["tipo"],
        slug=p["slug"],
        partido=p.get("partido"),
        foto_url=p.get("foto_url"),
        created_at=p["created_at"],
        updated_at=p["updated_at"],
        city_name=city_name,
        city_state=city_state
    )



@router.delete("/politicians/{politician_id}")
async def delete_politician(politician_id: UUID):
    """
    Delete a politician and free up the associated user email if found.
    """
    supabase = get_supabase_client()
    
    # 1. Get politician to find campaign_id
    pol_res = supabase.table("politicians").select("campaign_id, name").eq("id", str(politician_id)).single().execute()
    if not pol_res.data:
        raise HTTPException(status_code=404, detail="Politician not found")
        
    politician = pol_res.data
    campaign_id = politician.get("campaign_id")
    
    # 2. If active campaign, find associated auth user to free email
    if campaign_id:
        try:
            # List users and find the one with this campaign_id in metadata
            # Note: list_users() returns a list of User objects
            auth_users = supabase.auth.admin.list_users()
            target_user = None
            
            for u in auth_users:
                # Check metadata safely
                meta = getattr(u, "user_metadata", {}) or {}
                # Handle case where meta is dict or property
                if isinstance(meta, dict) and meta.get("campaign_id") == campaign_id:
                    target_user = u
                    break
            
            if target_user:
                print(f"Found auth user {target_user.email} for politician {politician['name']}")
                
                # Mangle email to allow reuse
                timestamp = int(datetime.now().timestamp())
                new_email = f"deleted_{timestamp}_{target_user.email}"
                
                # Update user email
                supabase.auth.admin.update_user_by_id(
                    target_user.id, 
                    {"email": new_email, "user_metadata": {**target_user.user_metadata, "is_deleted": True}}
                )
                print(f"User email updated to {new_email}")
                
        except Exception as e:
            print(f"Error handling auth user deletion: {e}")
            # We continue to delete the politician even if auth fails, but log it
    
    # 3. Explicitly delete Mandates (to ensure Radar cleanup)
    # Even if Cascade exists, this doesn't hurt. If no Cascade, this is required.
    try:
        supabase.table("mandates").delete().eq("politician_id", str(politician_id)).execute()
    except Exception as e:
        print(f"Warning: Failed to delete mandates: {e}")

    # 4. Delete Politician (Hard Delete)
    # Cascading deletes might handle campaign, but we ensure politician is gone
    result = supabase.table("politicians").delete().eq("id", str(politician_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to delete politician")
        
    return {"success": True, "message": "Politician deleted and email freed"}
