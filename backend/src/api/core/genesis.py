from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from src.crew.genesis_crew import GenesisCrew

router = APIRouter(prefix="/api/campaign", tags=["genesis"])


class GenesisRequest(BaseModel):
    persona: Optional[str] = "standard"
    strategy_mode: Optional[str] = None  # Override opcional para garantir a execução


@router.post("/{campaign_id}/genesis")
async def trigger_genesis(
    campaign_id: str,
    request: GenesisRequest,
    background_tasks: BackgroundTasks
):
    """
    Dispara a Genesis Crew para gerar estratégias táticas de campanha.
    
    A Genesis Crew é composta por 3 agentes de IA:
    1. Analista de Dados - Analisa PDFs e dados eleitorais
    2. Estrategista - Define pilares da campanha
    3. Planejador - Gera sugestões táticas
    
    Args:
        campaign_id: UUID da campanha
        request: Configurações (ex: persona, strategy_mode)
    
    Returns:
        Status da execução + run_id para monitoramento
    """
    import os
    from supabase import create_client
    # from src.crew.genesis_crew import GenesisCrew  <-- Moved to top to avoid lag
    
    # Cria o registro de execução ANTES de iniciar
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        supabase = create_client(supabase_url, supabase_key)
        
        # Cria o run com status "running"
        run_result = supabase.table("analysis_runs").insert({
            "campaign_id": campaign_id,
            "persona_name": request.persona,
            "status": "running",
            "strategic_plan_text": ""  # Será preenchido depois
        }).execute()
        
        run_id = run_result.data[0]["id"]
    except Exception as e:
        print(f"❌ Erro ao criar run: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize run: {str(e)}")
    
    def run_genesis_crew(campaign_id: str, persona: str, run_id: str, strategy_mode_override: str = None):
        """Função executada em background"""
        try:
            # Passamos o override do modo de estratégia se ele veio na request
            crew = GenesisCrew(
                campaign_id=campaign_id, 
                persona=persona, 
                run_id=run_id, 
                strategy_mode_override=strategy_mode_override
            )
            crew.log("🚀 Iniciando Genesis Crew", "System", "info")
            result = crew.execute()
            crew.log("✅ Genesis Crew finalizada com sucesso!", "System", "success")
            
            # Atualizar status do run para "completed"
            supabase.table("analysis_runs").update({
                "status": "completed"
            }).eq("id", run_id).execute()
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Erro na Genesis Crew: {error_msg}")
            
            # Registrar log de erro
            try:
                supabase.table("agent_logs").insert({
                    "run_id": run_id,
                    "campaign_id": campaign_id,
                    "agent_name": "System",
                    "message": f"ERRO CRÍTICO: {error_msg}",
                    "status": "error"
                }).execute()
                
                # Atualizar status do run para "failed"
                supabase.table("analysis_runs").update({
                    "status": "failed"
                }).eq("id", run_id).execute()
            except:
                pass
    
    # Adiciona a tarefa em background
    background_tasks.add_task(
        run_genesis_crew,
        campaign_id,
        request.persona,
        run_id,
        request.strategy_mode
    )
    
    return {
        "status": "processing",
        "message": "Genesis Crew iniciada em background. As estratégias serão salvas na tabela 'strategies' em alguns minutos.",
        "campaign_id": campaign_id,
        "persona": request.persona,
        "run_id": run_id  # ⭐ NOVO: Retorna o run_id para o frontend monitorar
    }


@router.post("/{campaign_id}/genesis/sync")
async def trigger_genesis_sync(
    campaign_id: str,
    request: GenesisRequest
):
    """
    Versão SÍNCRONA da Genesis Crew (para debug).
    Aguarda a conclusão antes de retornar.
    
    ⚠️ Pode levar 2-5 minutos para completar.
    """
    from src.crew.genesis_crew import GenesisCrew
    
    try:
        crew = GenesisCrew(campaign_id=campaign_id, persona=request.persona)
        result = crew.execute()
        
        return {
            "status": "success",
            "result": result
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
