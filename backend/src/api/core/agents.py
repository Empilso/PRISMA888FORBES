
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any, Dict, Union
import os
from supabase import create_client, Client

router = APIRouter(prefix="/api/agents", tags=["agents"])

# --- Helper ---
def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase credentials not found")
    return create_client(url, key)

# --- Models ---
class AgentBase(BaseModel):
    name: str # Slug, unique
    display_name: str
    role: str
    type: str = "generic"
    description: Optional[str] = None
    system_prompt: str
    tools: List[str] = []
    knowledge_base: List[Dict[str, Any]] = []
    compliance_rules: Union[List[str], Dict[str, Any]] = {}
    is_active: bool = True

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    knowledge_base: Optional[List[Dict[str, Any]]] = None
    compliance_rules: Optional[Union[List[str], Dict[str, Any]]] = None
    is_active: Optional[bool] = None

class Agent(AgentBase):
    id: str
    created_at: str
    updated_at: str

# --- Normalization Helper ---
def normalize_agent_data(agent_data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure compliance_rules is a dict, handling legacy list/null data."""
    cr = agent_data.get("compliance_rules")
    if isinstance(cr, list):
        # Legacy/Frontend format: keep as is
        pass
    elif not isinstance(cr, dict):
        # If None or other type, enforce empty dict
        agent_data["compliance_rules"] = {}
    
    # Also ensure tools is a list
    if not isinstance(agent_data.get("tools"), list):
        agent_data["tools"] = []
        
    # Ensure knowledge_base is a list
    if not isinstance(agent_data.get("knowledge_base"), list):
        agent_data["knowledge_base"] = []
        
    return agent_data

# --- Endpoints ---

@router.get("", response_model=List[Agent])
def list_agents(active_only: bool = True, type: Optional[str] = None):
    """List all agents."""
    try:
        supabase = get_supabase_client()
        query = supabase.table("agents").select("*")
        
        if active_only:
            query = query.eq("is_active", True)
            
        if type:
            query = query.eq("type", type)
            
        response = query.order("name").execute()
        
        # Normalize data before returning to avoid Pydantic validation errors
        agents = [normalize_agent_data(a) for a in response.data]
        return agents
        
    except Exception as e:
        print(f"❌ [AGENTS API] Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=Agent)
def create_agent(agent: AgentCreate):
    """Create a new agent."""
    try:
        supabase = get_supabase_client()
        
        # Check if name exists
        existing = supabase.table("agents").select("id").eq("name", agent.name).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Agent 'name' (slug) already exists.")
            
        data = agent.model_dump()
        response = supabase.table("agents").insert(data).execute()
        
        if not response.data:
             raise HTTPException(status_code=500, detail="Failed to create agent")
             
        return normalize_agent_data(response.data[0])
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [AGENTS API] Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}", response_model=Agent)
def get_agent(agent_id: str):
    """Get a specific agent."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("agents").select("*").eq("id", agent_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent not found")
            
        return normalize_agent_data(response.data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{agent_id}", response_model=Agent)
def update_agent(agent_id: str, agent: AgentUpdate):
    """Update an existing agent."""
    try:
        supabase = get_supabase_client()
        
        # Filter out None values
        data = {k: v for k, v in agent.model_dump().items() if v is not None}
        
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        response = supabase.table("agents").update(data).eq("id", agent_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent not found")
            
        return normalize_agent_data(response.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}")
def delete_agent(agent_id: str):
    """Delete an agent (hard delete)."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("agents").delete().eq("id", agent_id).execute()
        if not response.data:
             raise HTTPException(status_code=404, detail="Agent not found")
        return {"message": "Agent deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))


