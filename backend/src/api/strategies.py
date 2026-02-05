"""
API Router: Strategies
Gerenciamento de estratégias (ativação, aprovação, etc)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["strategies"])


def get_supabase_client():
    """Cria cliente Supabase com service role"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


class ActivateStrategyResponse(BaseModel):
    """Response do endpoint de ativação"""
    success: bool
    task_id: str
    message: str



class StrategyRead(BaseModel):
    id: str
    title: str
    description: str
    status: str
    pillar: Optional[str] = None
    phase: Optional[str] = None
    impact: Optional[str] = None
    effort: Optional[str] = None
    created_at: str

@router.get("/campaign/{campaign_id}/strategies", response_model=list[StrategyRead])
async def list_strategies(campaign_id: str, status: Optional[str] = None):
    """
    Lista estratégias de uma campanha, com filtro opcional por status.
    """
    supabase = get_supabase_client()
    
    query = supabase.table("strategies").select("*").eq("campaign_id", campaign_id)
    
    if status:
        query = query.eq("status", status)
        
    result = query.order("created_at", desc=True).execute()
    
    return result.data


@router.post("/campaign/{campaign_id}/strategies/{strategy_id}/activate", 
             response_model=ActivateStrategyResponse)
async def activate_strategy(campaign_id: str, strategy_id: str):
    """
    Ativa uma estratégia transformando-a em uma tarefa no Kanban.
    
    Fluxo:
    1. Busca a estratégia
    2. Verifica se pertence à campanha
    3. Cria uma nova tarefa baseada na estratégia
    4. Atualiza o status da estratégia para 'executed'
    
    Args:
        campaign_id: UUID da campanha
        strategy_id: UUID da estratégia
        
    Returns:
        Sucesso + ID da nova tarefa criada
    """
    supabase = get_supabase_client()
    
    # 1. Buscar a estratégia
    strategy_result = supabase.table("strategies") \
        .select("*") \
        .eq("id", strategy_id) \
        .eq("campaign_id", campaign_id) \
        .limit(1) \
        .execute()
    
    if not strategy_result.data or len(strategy_result.data) == 0:
        raise HTTPException(
            status_code=404, 
            detail="Estratégia não encontrada ou não pertence a esta campanha"
        )
    
    strategy = strategy_result.data[0]
    
    # Verificar se já foi executada
    if strategy.get("status") == "executed":
        raise HTTPException(
            status_code=400, 
            detail="Esta estratégia já foi transformada em tarefa"
        )
    
    # 2. Criar tarefa a partir da estratégia (com examples/tags preservados)
    task_data = {
        "campaign_id": campaign_id,
        "strategy_id": strategy_id,
        "title": strategy.get("title"),
        "description": strategy.get("description"),
        "status": "pending",
        "priority": "medium",
        # Preservar dados da estratégia (com fallback seguro)
        "examples": strategy.get("examples") or [],
        "tags": strategy.get("tags") or [],
        "pillar": strategy.get("pillar"),
        "phase": strategy.get("phase"),
    }
    
    task_result = supabase.table("tasks").insert(task_data).execute()
    
    if not task_result.data:
        raise HTTPException(
            status_code=500,
            detail="Erro ao criar tarefa no banco de dados"
        )
    
    created_task = task_result.data[0]
    
    # 3. Atualizar status da estratégia para 'executed'
    update_result = supabase.table("strategies") \
        .update({"status": "executed"}) \
        .eq("id", strategy_id) \
        .execute()
    
    if not update_result.data:
        # Rollback: deletar a tarefa criada
        supabase.table("tasks").delete().eq("id", created_task["id"]).execute()
        raise HTTPException(
            status_code=500,
            detail="Erro ao atualizar status da estratégia"
        )
    
    return ActivateStrategyResponse(
        success=True,
        task_id=created_task["id"],
        message=f"Tarefa '{strategy.get('title')}' criada com sucesso no Kanban!"
    )


@router.get("/campaign/{campaign_id}/strategies/{strategy_id}/status")
async def get_strategy_status(campaign_id: str, strategy_id: str):
    """
    Verifica o status atual de uma estratégia.
    
    Útil para verificar se já foi transformada em tarefa.
    """
    supabase = get_supabase_client()
    
    result = supabase.table("strategies") \
        .select("id, title, status, created_at") \
        .eq("id", strategy_id) \
        .eq("campaign_id", campaign_id) \
        .single() \
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Estratégia não encontrada")
    
    return result.data


@router.post("/campaign/{campaign_id}/strategies/{strategy_id}/reject")
async def reject_strategy(campaign_id: str, strategy_id: str):
    """
    Rejeita uma estratégia, removendo-a da lista de sugestões visíveis.
    
    Não deleta do banco - apenas marca como 'rejected' para manter histórico.
    
    Args:
        campaign_id: UUID da campanha
        strategy_id: UUID da estratégia
        
    Returns:
        Sucesso e ID da estratégia rejeitada
    """
    supabase = get_supabase_client()
    
    # 1. Verificar se a estratégia existe e pertence à campanha
    strategy_result = supabase.table("strategies") \
        .select("id, title, status") \
        .eq("id", strategy_id) \
        .eq("campaign_id", campaign_id) \
        .single() \
        .execute()
    
    if not strategy_result.data:
        raise HTTPException(
            status_code=404, 
            detail="Estratégia não encontrada ou não pertence a esta campanha"
        )
    
    strategy = strategy_result.data
    
    # Verificar se já foi executada
    if strategy.get("status") == "executed":
        raise HTTPException(
            status_code=400, 
            detail="Não é possível rejeitar uma estratégia já ativada. Use 'Desfazer' na tarefa."
        )
    
    # Verificar se já foi rejeitada
    if strategy.get("status") == "rejected":
        raise HTTPException(
            status_code=400, 
            detail="Esta estratégia já foi rejeitada"
        )
    
    # 2. Atualizar status para 'rejected'
    update_result = supabase.table("strategies") \
        .update({"status": "rejected"}) \
        .eq("id", strategy_id) \
        .execute()
    
    if not update_result.data:
        raise HTTPException(
            status_code=500,
            detail="Erro ao rejeitar estratégia"
        )
    
    return {
        "success": True,
        "strategy_id": strategy_id,
        "message": f"Estratégia '{strategy.get('title')}' foi rejeitada e removida da lista."
    }


class PublishCampaignRequest(BaseModel):
    strategy_ids: Optional[list[str]] = None  # Se None, publica todas as 'approved'


@router.post("/campaign/{campaign_id}/publish")
async def publish_campaign(campaign_id: str, request: PublishCampaignRequest):
    """
    Publica estratégias aprovadas, tornando-as visíveis para o candidato (cria tasks e seta status 'published').
    """
    supabase = get_supabase_client()
    
    # 1. Identificar estratégias a publicar
    query = supabase.table("strategies").select("*").eq("campaign_id", campaign_id)
    
    if request.strategy_ids:
        query = query.in_("id", request.strategy_ids)
    else:
        query = query.eq("status", "approved")
        
    strategies_res = query.execute()
    strategies = strategies_res.data
    
    if not strategies:
        return {"success": True, "published_count": 0, "message": "Nenhuma estratégia para publicar."}
    
    published_count = 0
    tasks_created = 0
    
    for strategy in strategies:
        # Pular se já publicada ou executada
        if strategy.get("status") in ["published", "executed"]:
            continue
        
        # 2. Criar Task correspondente
        try:
            # Mapear prioridade baseada no pilar
            priority_map = {
                "Fortaleza & Crescimento": "high",
                "Zeladoria de Resultado": "medium", 
                "Território & Presença": "medium",
                "Mobilização & Engajamento": "high"
            }
            priority = priority_map.get(strategy.get("pillar"), "medium")
            
            task_data = {
                "campaign_id": campaign_id,
                "strategy_id": strategy["id"],
                "title": strategy.get("title", "Tarefa sem título"),
                "description": strategy.get("description", ""),
                "status": "pending",
                "priority": priority,
                "pillar": strategy.get("pillar"),
                "phase": strategy.get("phase"),
                "tags": strategy.get("tags", []),
                "examples": strategy.get("examples", [])
            }
            
            supabase.table("tasks").insert(task_data).execute()
            tasks_created += 1
        except Exception as e:
            print(f"Erro ao criar task para estratégia {strategy['id']}: {e}")
            
        # 3. Atualizar Status para Published
        supabase.table("strategies").update({"status": "published"}).eq("id", strategy["id"]).execute()
        published_count += 1
        
    return {
        "success": True, 
        "published_count": published_count,
        "tasks_created": tasks_created,
        "message": f"{published_count} estratégias publicadas e {tasks_created} tarefas criadas!"
    }

