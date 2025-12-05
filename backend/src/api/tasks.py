from fastapi import APIRouter, HTTPException
import os
from supabase import create_client

router = APIRouter(prefix="/api/campaign", tags=["tasks"])


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


@router.post("/{campaign_id}/tasks/{task_id}/revert")
async def revert_task(campaign_id: str, task_id: str):
    """
    Reverte uma tarefa ativada, devolvendo-a para a lista de estratégias sugeridas.
    
    Fluxo:
    1. Busca a tarefa pelo ID
    2. Encontra o strategy_id original
    3. Deleta a tarefa
    4. Atualiza a estratégia para status 'approved'
    
    Returns:
        Sucesso e ID da estratégia restaurada
    """
    supabase = get_supabase_client()
    
    try:
        # 1. Buscar a tarefa para obter o strategy_id
        task_result = supabase.table("tasks").select("*").eq("id", task_id).single().execute()
        
        if not task_result.data:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        
        task = task_result.data
        strategy_id = task.get("strategy_id")
        
        if not strategy_id:
            raise HTTPException(
                status_code=400, 
                detail="Tarefa não possui estratégia vinculada (strategy_id)"
            )
        
        # 2. Deletar a tarefa
        delete_result = supabase.table("tasks").delete().eq("id", task_id).execute()
        
        # 3. Restaurar a estratégia para status 'approved'
        update_result = supabase.table("strategies").update({
            "status": "approved"
        }).eq("id", strategy_id).execute()
        
        if not update_result.data:
            raise HTTPException(
                status_code=500, 
                detail="Falha ao restaurar estratégia"
            )
        
        return {
            "status": "success",
            "message": "Tarefa revertida com sucesso",
            "task_id": task_id,
            "strategy_id": strategy_id,
            "strategy_status": "approved"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao reverter tarefa: {str(e)}")
