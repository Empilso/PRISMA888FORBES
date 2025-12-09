from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from supabase import create_client

router = APIRouter(prefix="/api/personas", tags=["personas"])


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


# PersonaConfig agora é um Dict livre para aceitar estruturas dinâmicas
# Pode conter: agents (dict), template_id, task_count, temperature, max_iter, num_examples, process_type
# Além dos legados: analyst, strategist, planner


class PersonaCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    icon: str = "🎭"
    config: Dict[str, Any]  # Aceita qualquer estrutura
    llm_model: Optional[str] = "gpt-4o-mini"
    type: Optional[str] = "strategy"
    is_active: Optional[bool] = True


class PersonaUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    config: Optional[Dict[str, Any]] = None  # Aceita qualquer estrutura
    llm_model: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_personas(active_only: bool = True):
    """
    Lista todas as personas disponíveis.
    
    Args:
        active_only: Se True, retorna apenas personas ativas
    
    Returns:
        Lista de personas
    """
    supabase = get_supabase_client()
    
    query = supabase.table("personas").select("*")
    
    if active_only:
        query = query.eq("is_active", True)
    
    result = query.order("created_at").execute()
    
    return {"personas": result.data}


@router.get("/{persona_id}")
async def get_persona(persona_id: str):
    """
    Busca uma persona específica por ID.
    
    Args:
        persona_id: UUID da persona
    
    Returns:
        Dados da persona
    """
    supabase = get_supabase_client()
    
    result = supabase.table("personas") \
        .select("*") \
        .eq("id", persona_id) \
        .single() \
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Persona não encontrada")
    
    return result.data


@router.post("")
async def create_persona(persona: PersonaCreate):
    """
    Cria uma nova persona.
    
    Args:
        persona: Dados da nova persona
    
    Returns:
        Persona criada
    """
    try:
        supabase = get_supabase_client()
        
        # Verifica se já existe uma persona com esse nome
        existing = supabase.table("personas") \
            .select("id") \
            .eq("name", persona.name) \
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=400,
                detail=f"Já existe uma persona com o nome '{persona.name}'"
            )
        
        # Cria a persona (config já é Dict[str, Any])
        result = supabase.table("personas").insert({
            "name": persona.name,
            "display_name": persona.display_name,
            "description": persona.description,
            "icon": persona.icon,
            "config": persona.config,  # Já é dict, não precisa de model_dump()
            "llm_model": persona.llm_model,
            "type": persona.type or "strategy",
            "is_active": persona.is_active
        }).execute()
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [PERSONAS API] Erro ao criar persona: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{persona_id}")
async def update_persona(persona_id: str, persona: PersonaUpdate):
    """
    Atualiza uma persona existente.
    
    Args:
        persona_id: UUID da persona
        persona: Dados para atualizar
    
    Returns:
        Persona atualizada
    """
    supabase = get_supabase_client()
    
    # Prepara os dados para atualização (apenas campos não-nulos)
    update_data = {}
    if persona.display_name is not None:
        update_data["display_name"] = persona.display_name
    if persona.description is not None:
        update_data["description"] = persona.description
    if persona.icon is not None:
        update_data["icon"] = persona.icon
    if persona.config is not None:
        update_data["config"] = persona.config  # Já é dict
    if persona.llm_model is not None:
        update_data["llm_model"] = persona.llm_model
    if persona.type is not None:
        update_data["type"] = persona.type
    if persona.is_active is not None:
        update_data["is_active"] = persona.is_active
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    # Atualiza a persona
    result = supabase.table("personas") \
        .update(update_data) \
        .eq("id", persona_id) \
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Persona não encontrada")
    
    return result.data[0]


@router.delete("/{persona_id}")
async def delete_persona(persona_id: str):
    """
    Deleta uma persona (soft delete - marca como inativa).
    
    Args:
        persona_id: UUID da persona
    
    Returns:
        Mensagem de sucesso
    """
    supabase = get_supabase_client()
    
    # Soft delete - apenas marca como inativa
    result = supabase.table("personas") \
        .update({"is_active": False}) \
        .eq("id", persona_id) \
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Persona não encontrada")
    
    return {"message": "Persona desativada com sucesso"}
