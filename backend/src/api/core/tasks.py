from fastapi import APIRouter, HTTPException, Body
import os
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from supabase import create_client

router = APIRouter(prefix="/api/campaign", tags=["tasks"])

class CommentCreate(BaseModel):
    profile_id: str
    content: str



def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


@router.get("/{campaign_id}/tasks")
async def list_tasks(campaign_id: str):
    """
    Lista todas as tarefas de uma campanha.
    """
    supabase = get_supabase_client()
    
    try:
        # Busca tarefas com join no responsável (assignee_id)
        tasks = supabase.table("tasks") \
            .select("*, assignee:assignee_id(full_name, avatar_url)") \
            .eq("campaign_id", campaign_id) \
            .order("created_at", desc=True) \
            .execute()
            
        return tasks.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar tarefas: {str(e)}")


@router.put("/{campaign_id}/tasks/{task_id}")
async def update_task(campaign_id: str, task_id: str, updates: dict = Body(...)):
    """
    Atualiza uma tarefa e registra no histórico.
    """
    supabase = get_supabase_client()
    # 0. Get old state for history (resilient fetch)
    try:
        old_task_res = supabase.table("tasks").select("status, priority").eq("id", task_id).execute()
        old_task = old_task_res.data[0] if old_task_res.data else None
    except Exception as e:
        print(f"[Tasks] Warning: Failed to fetch old state: {e}")
        old_task = None
    
    # Extract user_id and cleanup updates
    user_id = updates.pop("last_modified_by", None)
    
    try:
        # Perform update targeting ONLY the UUID (campaign_id filter is redundant and risky if null)
        result = supabase.table("tasks").update(updates).eq("id", task_id).execute()
        
        if not result.data:
            print(f"[Tasks] Error: No data returned for update on {task_id}")
            raise HTTPException(status_code=404, detail=f"Tarefa {task_id} não encontrada ou sem permissão")

        # 1. Automatic History Logging
        if old_task and user_id:
            for field in ["status", "priority"]:
                if field in updates and updates[field] != old_task.get(field):
                    try:
                        supabase.table("task_history").insert({
                            "task_id": task_id,
                            "action": f"Alterou {field}",
                            "from_value": str(old_task.get(field)),
                            "to_value": str(updates[field]),
                            "user_id": user_id
                        }).execute()
                    except Exception as he:
                        print(f"[Tasks] History Log Failed: {he}")
            
        return result.data[0]
    except Exception as e:
        print(f"[Tasks] Fatal Update Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao atualizar tarefa: {str(e)}")


@router.get("/{campaign_id}/tasks/{task_id}/comments")
async def list_task_comments(task_id: str):
    """Lista comentários de uma tarefa com dados do perfil"""
    supabase = get_supabase_client()
    try:
        res = supabase.table("task_comments") \
            .select("*, profiles(full_name, avatar_url)") \
            .eq("task_id", task_id) \
            .order("created_at", desc=False) \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{campaign_id}/tasks/{task_id}/comments")
async def add_task_comment(task_id: str, payload: CommentCreate):
    """Adiciona um novo comentário à tarefa"""
    supabase = get_supabase_client()
    try:
        res = supabase.table("task_comments").insert({
            "task_id": task_id,
            "profile_id": payload.profile_id,
            "content": payload.content
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{campaign_id}/tasks/{task_id}/history")
async def get_task_history(task_id: str):
    """Retorna o log de atividades da tarefa"""
    supabase = get_supabase_client()
    try:
        res = supabase.table("task_history") \
            .select("*, profiles(full_name)") \
            .eq("task_id", task_id) \
            .order("created_at", desc=True) \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.delete("/{campaign_id}/tasks/{task_id}")
async def delete_task(campaign_id: str, task_id: str):
    """
    Exclui uma tarefa.
    """
    supabase = get_supabase_client()
    try:
        result = supabase.table("tasks").delete().eq("id", task_id).eq("campaign_id", campaign_id).execute()
        
        # O supabase retorna os dados deletados. Se vazio, não achou.
        if not result.data:
             raise HTTPException(status_code=404, detail="Tarefa não encontrada para exclusão")
             
        return {"message": "Tarefa excluída", "id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir tarefa: {str(e)}")


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
        
        # 3. Restaurar a estratégia para status 'published'
        update_result = supabase.table("strategies").update({
            "status": "published"
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
            "strategy_status": "published"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao reverter tarefa: {str(e)}")
