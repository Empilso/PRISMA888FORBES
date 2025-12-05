"""
API Router: Campaign
Gerenciamento de campanhas e runs de análise
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from supabase import create_client
from dotenv import load_dotenv

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
async def delete_analysis_run(campaign_id: str, run_id: str):
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
    
    # 2. Deletar a run (ON DELETE CASCADE vai limpar estratégias e logs)
    delete_result = supabase.table("analysis_runs") \
        .delete() \
        .eq("id", run_id) \
        .execute()
    
    if not delete_result.data:
        raise HTTPException(
            status_code=500,
            detail="Erro ao deletar run de análise"
        )
    
    return DeleteRunResponse(
        success=True,
        message=f"Análise '{run['persona_name']}' deletada com sucesso (incluindo {delete_result.data[0] if delete_result.data else 'suas'} estratégias e logs)",
        deleted_run_id=run_id
    )
