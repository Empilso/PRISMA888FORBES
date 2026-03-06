"""
API Router: Campaign
Gerenciamento de campanhas e runs de análise
"""

from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from src.api.core.organizations import get_current_user_id

load_dotenv()

router = APIRouter(prefix="/api", tags=["campaign"])


def get_supabase_client():
    """Cria cliente Supabase com service role"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


class DeleteRunResponse(BaseModel):
    """Response do endpoint de deleção"""
    success: bool
    message: str
    deleted_run_id: str


@router.delete("/campaign/{campaign_id}/run/{run_id}", 
              response_model=DeleteRunResponse)
async def delete_analysis_run(campaign_id: str, run_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Deleta uma versão de análise (run) e todos seus dados relacionados.
    
    Fluxo:
    1. Verifica se a run existe e pertence à campanha
    2. Deleta a run (CASCADE vai deletar estratégias e logs automaticamente)
    
    Args:
        campaign_id: UUID da campanha
        run_id: UUID da run de análise
        
    Returns:
        Confirmação de sucesso
    """
    supabase = get_supabase_client()
    
    # 1. Verificar se a run existe e pertence à campanha
    run_result = supabase.table("analysis_runs") \
        .select("id, persona_name, created_at") \
        .eq("id", run_id) \
        .eq("campaign_id", campaign_id) \
        .single() \
        .execute()
    
    if not run_result.data:
        raise HTTPException(
            status_code=404, 
            detail="Run de análise não encontrada ou não pertence a esta campanha"
        )
    
    run = run_result.data
    
    # 2. Limpar métricas de IA e logs antigos associados a esta run (Task cleanup)
    try:
        # ai_execution_logs usa trace_id como run_id
        supabase.table("ai_execution_logs").delete().eq("trace_id", run_id).execute()
        # agent_logs usa run_id
        supabase.table("agent_logs").delete().eq("run_id", run_id).execute()
    except Exception as e:
        print(f"Erro ao limpar métricas AI para a run {run_id}: {e}")

    # 3. Deletar a run (ON DELETE CASCADE vai limpar estratégias mapeadas)
    delete_result = supabase.table("analysis_runs") \
        .delete() \
        .eq("id", run_id) \
        .execute()
    
    # NOTA: O Supabase retorna [] (lista vazia) em DELETE bem-sucedido, que é falsy em Python.
    # Verificamos None explicitamente para distinguir falha real de delete bem-sucedido sem RETURNING.
    if delete_result.data is None:
        raise HTTPException(
            status_code=500,
            detail="Erro ao deletar run de análise"
        )
    
    return DeleteRunResponse(
        success=True,
        message=f"Análise '{run['persona_name']}' deletada com sucesso (incluindo todas as métricas dos agentes AI e estratégias)",
        deleted_run_id=run_id
    )


class CancelRunResponse(BaseModel):
    success: bool
    message: str


@router.post("/campaign/{campaign_id}/run/{run_id}/cancel", response_model=CancelRunResponse)
async def cancel_analysis_run(campaign_id: str, run_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Interrompe uma análise em andamento.
    Define status para 'cancelled' e insere log de sistema.
    """
    supabase = get_supabase_client()

    # 1. Update status
    # Usamos update para 'cancelled'. O frontend vai perceber isso via polling ou user action.
    result = supabase.table("analysis_runs") \
        .update({"status": "cancelled"}) \
        .eq("id", run_id) \
        .eq("campaign_id", campaign_id) \
        .execute()

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Run não encontrada para cancelamento."
        )

    # 2. Insert Log system-level
    try:
        supabase.table("agent_logs").insert({
            "run_id": run_id,
            "agent_name": "System",
            "message": "⛔ Execução interrompida manualmente pelo usuário.",
            "status": "error"
        }).execute()
    except Exception as e:
        print(f"Erro ao logar cancelamento: {e}")

    return CancelRunResponse(success=True, message="Processo cancelado com sucesso.")

# --- AGENTE DE GUERRILHA (Micro-Targeting) ---

class TacticalActionResponse(BaseModel):
    success: bool
    action_title: str
    action_description: str
    strategy_id: str

@router.post("/campaign/{campaign_id}/location/{location_id}/tactical_action", response_model=TacticalActionResponse)
async def generate_tactical_action(campaign_id: str, location_id: int):
    """
    Gera uma ação tática de micro-targeting para um local específico.
    Refatorado para usar TacticalAIService (Consolidado).
    """
    try:
        from src.services.tactical_ai import TacticalAIService
        service = TacticalAIService()
        strategy = service.generate_suggestion(campaign_id, location_id=location_id)
        
        return TacticalActionResponse(
            success=True,
            action_title=strategy.get('title', 'Ação Sugerida'),
            action_description=strategy.get('description', ''),
            strategy_id=str(strategy.get('id', ''))
        )
    except Exception as e:
        print(f"Erro no Agente de Guerrilha: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- GESTÃO DE ORGANIZAÇÃO (SUPER ADMIN) ---

class AssignOrganizationPayload(BaseModel):
    organization_id: Optional[str] = None

class AssignOrganizationResponse(BaseModel):
    success: bool
    message: str

@router.put("/campaign/{campaign_id}/organization", response_model=AssignOrganizationResponse)
async def assign_campaign_organization(campaign_id: str, payload: AssignOrganizationPayload = Body(...), user_id: str = Depends(get_current_user_id)):
    """
    Atribui uma campanha a uma organização (Partido).
    Usado pelo painel de Super Admin. Organização pode ser nula para remover vínculo.
    """
    supabase = get_supabase_client()
    
    try:
        # Verifica se a campanha existe
        camp_check = supabase.table("campaigns").select("id").eq("id", campaign_id).single().execute()
        if not camp_check.data:
            raise HTTPException(status_code=404, detail="Campanha não encontrada")
            
        # Verifica se a organização existe (se for fornecida)
        if payload.organization_id:
            org_check = supabase.table("organizations").select("id").eq("id", payload.organization_id).single().execute()
            if not org_check.data:
                raise HTTPException(status_code=404, detail="Organização não encontrada")
        
        # Atualiza a campanha
        result = supabase.table("campaigns").update({"organization_id": payload.organization_id}).eq("id", campaign_id).execute()
        
        if not result.data:
             raise HTTPException(status_code=500, detail="Nenhum dado retornado ao atualizar")
             
        action = "atribuída à organização" if payload.organization_id else "desvinculada da organização"
        return AssignOrganizationResponse(success=True, message=f"Campanha {action} com sucesso.")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao atribuir organização: {e}")
        raise HTTPException(status_code=500, detail=str(e))
