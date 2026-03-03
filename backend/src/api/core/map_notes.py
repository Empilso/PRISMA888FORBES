from fastapi import APIRouter, HTTPException, Query, Body, Depends
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import os
from supabase import create_client

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

router = APIRouter(prefix="/api", tags=["map_notes"])

# --- Models ---

class MapNoteBase(BaseModel):
    title: str
    body: str
    type: str = "alerta"
    status: str = "aberta"
    priority: int = 3
    lat: float
    lng: float
    location_id: Optional[int] = None # BigInt in DB, int in Pydantic
    assignee_id: Optional[UUID] = None
    color: str = "#F59E0B"
    shape: str = "circle"

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError('Priority must be between 1 and 5')
        return v

class MapNoteCreate(MapNoteBase):
    pass

class MapNoteUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    assignee_id: Optional[UUID] = None
    location_id: Optional[int] = None
    color: Optional[str] = None
    shape: Optional[str] = None

class MapNoteResponse(MapNoteBase):
    id: UUID
    campaign_id: UUID
    author_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/campaign/{campaign_id}/map_notes", response_model=List[MapNoteResponse])
async def list_map_notes(
    campaign_id: UUID,
    status: Optional[str] = None,
    type: Optional[str] = None,
    assignee_id: Optional[UUID] = None
):
    supabase = get_supabase_client()
    query = supabase.table("map_notes").select("*").eq("campaign_id", str(campaign_id))

    if status:
        query = query.eq("status", status)
    if type:
        query = query.eq("type", type)
    if assignee_id:
        query = query.eq("assignee_id", str(assignee_id))
    
    query = query.order("created_at", desc=True)
    
    result = query.execute()
    
    if not result.data:
        return []
    
    return result.data

@router.post("/campaign/{campaign_id}/map_notes", response_model=MapNoteResponse)
async def create_map_note(
    campaign_id: UUID,
    note: MapNoteCreate,
    # TODO: Add User Auth Dependency to get author_id
):
    supabase = get_supabase_client()
    
    # Payload matches DB Schema
    data = note.dict()
    data["campaign_id"] = str(campaign_id)
    # data["author_id"] = current_user.id  <-- Needs Auth integration
    
    result = supabase.table("map_notes").insert(data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create map note")
        
    return result.data[0]

@router.patch("/campaign/{campaign_id}/map_notes/{note_id}", response_model=MapNoteResponse)
async def update_map_note(
    campaign_id: UUID,
    note_id: UUID,
    updates: MapNoteUpdate
):
    supabase = get_supabase_client()
    
    data = updates.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No updates provided")

    result = supabase.table("map_notes").update(data).eq("id", str(note_id)).eq("campaign_id", str(campaign_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Map note not found")
        
    return result.data[0]

@router.delete("/campaign/{campaign_id}/map_notes/{note_id}")
async def delete_map_note(
    campaign_id: UUID,
    note_id: UUID
):
    supabase = get_supabase_client()
    result = supabase.table("map_notes").delete().eq("id", str(note_id)).eq("campaign_id", str(campaign_id)).execute()
    
    if not result.data:
         # Note: delete() returns data of deleted rows. If empty, maybe it didn't exist or RLS blocked.
         # But for delete, usually 204 or success message is enough.
         pass 

    return {"success": True, "message": "Map note deleted"}

@router.post("/campaign/{campaign_id}/map_notes/{note_id}/ai_action")
async def generate_note_action(
    campaign_id: UUID,
    note_id: UUID
):
    supabase = get_supabase_client()
    
    # 1. Fetch the Note to get content and context
    note_res = supabase.table("map_notes").select("*").eq("id", str(note_id)).single().execute()
    if not note_res.data:
        raise HTTPException(status_code=404, detail="Note not found")
    note = note_res.data
    
    try:
        from src.services.tactical_ai import TacticalAIService
        service = TacticalAIService()
        
        # Convert BigInt or None to int
        loc_id = note.get("location_id")
        
        strategy = service.generate_suggestion(
            campaign_id=str(campaign_id),
            location_id=int(loc_id) if loc_id else None,
            note_content=f"{note['title']}: {note['body']}",
            lat=note['lat'],
            lng=note['lng']
        )
        
        return {
            "success": True,
            "action_title": strategy['title'],
            "action_description": strategy['description'],
            "strategy_id": strategy['id']
        }
    except Exception as e:
        print(f"Error generating generic action: {e}")
        raise HTTPException(status_code=500, detail=str(e))
