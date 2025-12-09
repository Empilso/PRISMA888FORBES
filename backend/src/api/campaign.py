"""
API Router: Campaign
Gerenciamento de campanhas e runs de análise
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from supabase import create_client
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

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


class CancelRunResponse(BaseModel):
    success: bool
    message: str


@router.post("/campaign/{campaign_id}/run/{run_id}/cancel", response_model=CancelRunResponse)
async def cancel_analysis_run(campaign_id: str, run_id: str):
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
    Usa LLM + Contexto (RAG Light) + Dados do Local.
    """
    supabase = get_supabase_client()

    # 1. Coleta de Inteligência
    # Local
    loc_res = supabase.table("locations").select("*").eq("id", location_id).single().execute()
    if not loc_res.data:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    location = loc_res.data

    # Rivais (Location Results) - simulação de dados se não houver
    # Idealmente, buscaríamos em location_results
    rivals_res = supabase.table("location_results") \
        .select("candidate_name, votes") \
        .eq("location_id", location_id) \
        .order("votes", desc=True) \
        .limit(3) \
        .execute()
    rivals_context = "\n".join([f"- {r['candidate_name']}: {r['votes']} votos" for r in rivals_res.data]) if rivals_res.data else "Sem dados de rivais."

    # Histórico de Tarefas no Local
    tasks_res = supabase.table("strategies") \
        .select("title") \
        .eq("location_id", location_id) \
        .execute()
    tasks_context = "\n".join([f"- {t['title']}" for t in tasks_res.data]) if tasks_res.data else "Nenhuma ação realizada ainda."

    # Contexto RAG (Plano de Governo) - Simplificado: busca chunks aleatórios ou recentes para 'dar o tom'
    # O ideal seria busca vetorial, mas vamos simular pegando qualquer chunk de PDF
    docs_res = supabase.table("documents") \
        .select("content_text") \
        .eq("campaign_id", campaign_id) \
        .eq("file_type", "pdf_chunk") \
        .limit(3) \
        .execute()
    rag_context = "\n\n".join([d['content_text'][:500] + "..." for d in docs_res.data]) if docs_res.data else "Sem plano de governo disponível."

    # 2. O Cérebro (LLM Chain)
    prompt = f"""
    Analise este cenário de batalha eleitoral local:
    
    LOCAL: {location.get('name', 'Desconhecido')}
    ENDEREÇO: {location.get('address', 'Não informado')} (Infira o perfil socioeconômico pelo endereço se possível)
    
    CENÁRIO RIVAL (Top Oponentes aqui):
    {rivals_context}
    
    CONTEXTO DO PLANO DE GOVERNO (Diretrizes):
    {rag_context}
    
    AÇÕES JÁ REALIZADAS AQUI:
    {tasks_context}
    
    MISSÃO:
    Sugira UMA (1) ação tática de alto impacto ("Micro-Targeting") para virar votos ou consolidar este local.
    A ação deve ser concreta, criativa e executável em curto prazo.
    Não seja genérico. Use o contexto do local.
    
    FORMATO DE SAÍDA:
    Título: [Título Curto e Impactante]
    Descrição: [Descrição detalhada da ação em 1 parágrafo]
    """

    try:
        llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
        response = llm.invoke([
            SystemMessage(content="Você é um estrategista político de guerrilha, especialista em micro-targeting."),
            HumanMessage(content=prompt)
        ])
        content = response.content
        
        # Parse simples (assumindo que o LLM obedece o formato, mas vamos garantir)
        lines = content.split('\n')
        title = "Ação Tática Local"
        description = content
        
        for line in lines:
            if line.strip().lower().startswith("título:"):
                title = line.split(":", 1)[1].strip()
            if line.strip().lower().startswith("descrição:"):
                # A descrição pode ser multiline, mas vamos pegar o resto
                pass
        
        # Se descrição ficou vazia, usa o content limpo do título
        description = content.replace(f"Título: {title}", "").replace("Descrição:", "").strip()

        # 3. Ação: Criar a tarefa
        strategy_data = {
            "campaign_id": campaign_id,
            "title": title,
            "description": description,
            "phase": "Reta Final", # Default phase
            "pillar": "Micro-Targeting",
            "status": "suggested",
            "location_id": location_id,
            "category": "Guerrilha"
        }
        
        insert_res = supabase.table("strategies").insert(strategy_data).execute()
        
        if not insert_res.data:
             raise HTTPException(status_code=500, detail="Erro ao salvar estratégia gerada")
             
        new_strategy = insert_res.data[0]
        
        return TacticalActionResponse(
            success=True, 
            action_title=title, 
            action_description=description,
            strategy_id=new_strategy['id']
        )

    except Exception as e:
        print(f"Erro no Agente de Guerrilha: {e}")
        raise HTTPException(status_code=500, detail=str(e))
