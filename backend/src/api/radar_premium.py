"""
Radar Premium API - Offices & Mandates + Phase Execution
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, BackgroundTasks, Body
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field
import os
import json
import logging
from supabase import create_client
from openai import OpenAI

# Setup logging
logger = logging.getLogger("radar_premium")
logger.setLevel(logging.INFO)

# Primary router for API resources
router = APIRouter(tags=["radar-premium"])

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


# ============ SCHEMAS ============

class OfficeRead(BaseModel):
    id: UUID
    name: str
    slug: str
    level: str
    created_at: datetime

    class Config:
        from_attributes = True


class MandateCreate(BaseModel):
    politician_id: UUID
    office_id: UUID
    city_id: UUID
    campaign_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = True


class MandateRead(BaseModel):
    id: UUID
    politician_id: UUID
    office_id: UUID
    city_id: UUID
    campaign_id: Optional[UUID]
    start_date: Optional[date]
    end_date: Optional[date]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Joined data
    politician_name: Optional[str] = None
    politician_partido: Optional[str] = None
    office_name: Optional[str] = None
    city_name: Optional[str] = None
    city_state: Optional[str] = None

    class Config:
        from_attributes = True


class RadarExecutionRead(BaseModel):
    id: UUID
    campaign_id: UUID
    mandate_id: UUID
    phase: str
    status: str
    started_at: datetime
    finished_at: Optional[datetime]
    summary: Optional[dict]
    error_message: Optional[str]
    logs: Optional[List[dict]] = None

    class Config:
        from_attributes = True


class PhaseStatusRead(BaseModel):
    phase1: Optional[RadarExecutionRead] = None
    phase2: Optional[RadarExecutionRead] = None
    phase3: Optional[RadarExecutionRead] = None
    verify: Optional[RadarExecutionRead] = None

class Phase3Request(BaseModel):
    target_sites: List[str] = []
    search_mode: str = Field("hybrid", description="Mode: open, focused, hybrid")
    max_results: int = Field(10, ge=5, le=50)


# ============ API RESOURCES (Prefix: /api) ============

@router.get("/api/offices", response_model=List[OfficeRead])
async def list_offices(
    level: Optional[str] = Query(None, description="Filter by level: municipal, estadual, federal")
):
    """List all available political offices/cargos"""
    supabase = get_supabase_client()
    query = supabase.table("offices").select("*")
    if level:
        query = query.eq("level", level)
    result = query.order("name").execute()
    return result.data or []


@router.post("/api/mandates", response_model=MandateRead)
async def create_mandate(mandate: MandateCreate):
    """Create a new mandate (politician + office + city)"""
    supabase = get_supabase_client()
    
    data = {
        "politician_id": str(mandate.politician_id),
        "office_id": str(mandate.office_id),
        "city_id": str(mandate.city_id),
        "campaign_id": str(mandate.campaign_id) if mandate.campaign_id else None,
        "start_date": mandate.start_date.isoformat() if mandate.start_date else None,
        "end_date": mandate.end_date.isoformat() if mandate.end_date else None,
        "is_active": mandate.is_active
    }
    
    result = supabase.table("mandates").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create mandate")
    
    m = result.data[0]
    
    # Fetch joined data
    politician = supabase.table("politicians").select("name, partido").eq("id", m["politician_id"]).execute()
    office = supabase.table("offices").select("name").eq("id", m["office_id"]).execute()
    city = supabase.table("cities").select("name, state").eq("id", m["city_id"]).execute()
    
    return MandateRead(
        id=m["id"],
        politician_id=m["politician_id"],
        office_id=m["office_id"],
        city_id=m["city_id"],
        campaign_id=m.get("campaign_id"),
        start_date=m.get("start_date"),
        end_date=m.get("end_date"),
        is_active=m["is_active"],
        created_at=m["created_at"],
        updated_at=m["updated_at"],
        politician_name=politician.data[0]["name"] if politician.data else None,
        politician_partido=politician.data[0].get("partido") if politician.data else None,
        office_name=office.data[0]["name"] if office.data else None,
        city_name=city.data[0]["name"] if city.data else None,
        city_state=city.data[0]["state"] if city.data else None
    )


@router.get("/api/mandates", response_model=List[MandateRead])
async def list_mandates(
    city_id: Optional[UUID] = Query(None, description="Filter by city"),
    office_id: Optional[UUID] = Query(None, description="Filter by office"),
    campaign_id: Optional[UUID] = Query(None, description="Filter by campaign"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, le=200)
):
    """List mandates with optional filters"""
    supabase = get_supabase_client()
    
    query = supabase.table("mandates").select("*")
    
    if city_id:
        query = query.eq("city_id", str(city_id))
    if office_id:
        query = query.eq("office_id", str(office_id))
    if campaign_id:
        query = query.eq("campaign_id", str(campaign_id))
    if is_active is not None:
        query = query.eq("is_active", is_active)
    
    result = query.order("created_at", desc=True).limit(limit).execute()
    
    if not result.data and campaign_id:
        # AUTO-INITIALIZATION FOR NEW CAMPAIGNS (Dashboard Fix)
        # If accessing via campaign but no mandate exists, create a default one.
        try:
            print(f"[Mandate Auto-Init] No mandate found for campaign {campaign_id}. Attempting initialization...")
            
            # 1. Get Campaign Context
            camp_res = supabase.table("campaigns").select("politician_id, city_id").eq("id", str(campaign_id)).single().execute()
            if camp_res.data:
                pol_id = camp_res.data["politician_id"]
                city_id = camp_res.data.get("city_id")

                # If missing city in campaign, try politician
                if not city_id:
                    pol_res = supabase.table("politicians").select("city_id").eq("id", pol_id).single().execute()
                    if pol_res.data:
                        city_id = pol_res.data.get("city_id")

                if city_id and pol_id:
                    # 2. Get/Find "Prefeito" Office (Default)
                    office_res = supabase.table("offices").select("id").ilike("name", "Prefeito%").limit(1).execute()
                    if office_res.data:
                        office_id = office_res.data[0]["id"]
                        
                        # 3. Create Default Mandate
                        new_mandate = {
                            "politician_id": pol_id,
                            "city_id": city_id,
                            "office_id": office_id,
                            "campaign_id": str(campaign_id),
                            "is_active": True,
                            "start_date": "2025-01-01",
                            "end_date": "2028-12-31"
                        }
                        
                        insert_res = supabase.table("mandates").insert(new_mandate).execute()
                        if insert_res.data:
                             print(f"[Mandate Auto-Init] Created default mandate: {insert_res.data[0]['id']}")
                             # Update result to include the new mandate
                             # We need to re-query to match the expected structure if possible, or just append
                             # Re-executing main query to include joins:
                             result = query.order("created_at", desc=True).limit(limit).execute()
                             
        except Exception as e:
            print(f"[Mandate Auto-Init] Failed: {e}")
            # Continue to return empty if failed

    if not result.data:
        return []
    
    # Fetch joined data
    politician_ids = list(set([m["politician_id"] for m in result.data]))
    office_ids = list(set([m["office_id"] for m in result.data]))
    city_ids = list(set([m["city_id"] for m in result.data]))
    
    politicians = supabase.table("politicians").select("id, name, partido").in_("id", politician_ids).execute()
    offices = supabase.table("offices").select("id, name").in_("id", office_ids).execute()
    cities = supabase.table("cities").select("id, name, state").in_("id", city_ids).execute()
    
    pol_map = {p["id"]: p for p in politicians.data} if politicians.data else {}
    off_map = {o["id"]: o for o in offices.data} if offices.data else {}
    city_map = {c["id"]: c for c in cities.data} if cities.data else {}
    
    mandates = []
    for m in result.data:
        pol = pol_map.get(m["politician_id"], {})
        off = off_map.get(m["office_id"], {})
        city = city_map.get(m["city_id"], {})
        
        mandates.append(MandateRead(
            id=m["id"],
            politician_id=m["politician_id"],
            office_id=m["office_id"],
            city_id=m["city_id"],
            campaign_id=m.get("campaign_id"),
            start_date=m.get("start_date"),
            end_date=m.get("end_date"),
            is_active=m["is_active"],
            created_at=m["created_at"],
            updated_at=m["updated_at"],
            politician_name=pol.get("name"),
            politician_partido=pol.get("partido"),
            office_name=off.get("name"),
            city_name=city.get("name"),
            city_state=city.get("state")
        ))
    
    return mandates


@router.get("/api/mandates/{mandate_id}", response_model=MandateRead)
async def get_mandate(mandate_id: UUID):
    """Get mandate by ID"""
    supabase = get_supabase_client()
    
    result = supabase.table("mandates").select("*").eq("id", str(mandate_id)).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Mandate not found")
    
    m = result.data
    
    # Fetch joined data
    politician = supabase.table("politicians").select("name, partido").eq("id", m["politician_id"]).execute()
    office = supabase.table("offices").select("name").eq("id", m["office_id"]).execute()
    city = supabase.table("cities").select("name, state").eq("id", m["city_id"]).execute()
    
    return MandateRead(
        id=m["id"],
        politician_id=m["politician_id"],
        office_id=m["office_id"],
        city_id=m["city_id"],
        campaign_id=m.get("campaign_id"),
        start_date=m.get("start_date"),
        end_date=m.get("end_date"),
        is_active=m["is_active"],
        created_at=m["created_at"],
        updated_at=m["updated_at"],
        politician_name=politician.data[0]["name"] if politician.data else None,
        politician_partido=politician.data[0].get("partido") if politician.data else None,
        office_name=office.data[0]["name"] if office.data else None,
        city_name=city.data[0]["name"] if city.data else None,
        city_state=city.data[0]["state"] if city.data else None
    )


@router.get("/api/mandates/{mandate_id}/phase-status", response_model=PhaseStatusRead)
async def get_mandate_phase_status(mandate_id: UUID):
    """Get the execution status of all phases for a mandate"""
    supabase = get_supabase_client()
    
    # Get latest execution for each phase
    result = supabase.table("radar_executions") \
        .select("*") \
        .eq("mandate_id", str(mandate_id)) \
        .order("started_at", desc=True) \
        .execute()
    
    status = PhaseStatusRead()
    
    if result.data:
        seen_phases = set()
        for execution_row in result.data:
            phase = execution_row["phase"]
            if phase not in seen_phases:
                seen_phases.add(phase)
                exec_read = RadarExecutionRead(
                    id=execution_row["id"],
                    campaign_id=execution_row["campaign_id"],
                    mandate_id=execution_row["mandate_id"],
                    phase=execution_row["phase"],
                    status=execution_row["status"],
                    started_at=execution_row["started_at"],
                    finished_at=execution_row.get("finished_at"),
                    summary=execution_row.get("summary"),
                    error_message=execution_row.get("error_message")
                )
                
                # Fetch logs if accessible (focused on running or recently finished)
                # To capture real-time progress for the UI console
                if execution_row["status"] in ["running", "ok", "error"]:
                     logs_res = supabase.table("agent_logs") \
                        .select("created_at, message, agent_name, status") \
                        .eq("run_id", execution_row["id"]) \
                        .order("created_at", desc=False) \
                        .limit(100) \
                        .execute()
                     if logs_res.data:
                         exec_read.logs = logs_res.data



                if phase == "phase1":
                    status.phase1 = exec_read
                elif phase == "phase2":
                    status.phase2 = exec_read
                elif phase == "phase3":
                    status.phase3 = exec_read
                elif phase == "verify":
                    status.verify = exec_read
    
    return status


# ============ BACKGROUND TASK HELPER ============

def _extract_promises_background(
    campaign_id: str,
    mandate_id: str,
    politician_id: str,
    exec_id: str
):
    """
    Background task for heavy PDF processing.
    This runs asynchronously after the HTTP response is sent.
    """
    logger.info(f"🚀 INICIANDO EXTRAÇÃO BACKGROUND para campanha {campaign_id[:8]}, mandate {mandate_id[:8]}")
    
    supabase = get_supabase_client()
    
    try:
        # 1. Find the document
        docs_res = supabase.table("documents") \
            .select("id, filename, file_url, content_text") \
            .eq("person_id", politician_id) \
            .eq("doc_type", "government_plan") \
            .limit(1) \
            .execute()
        
        if not docs_res.data:
            logger.error(f"❌ Documento não encontrado para politician_id {politician_id[:8]}")
            supabase.table("radar_executions").update({
                "status": "error",
                "finished_at": datetime.now().isoformat(),
                "error_message": "Documento não encontrado"
            }).eq("id", exec_id).execute()
            return
        
        doc = docs_res.data[0]
        full_text = doc.get("content_text", "")
        
        # 2. Extract text if not cached
        if not full_text or len(full_text) < 100:
            logger.info(f"📄 Extraindo texto do PDF {doc.get('filename')}...")
            
            from src.services.pdf_service import PDFExtractionService
            service = PDFExtractionService()
            result = service.extract_text(doc.get("file_url", ""))
            
            if result.success:
                full_text = result.text
                # Cache it
                supabase.table("documents").update({"content_text": full_text}).eq("id", doc["id"]).execute()
                logger.info(f"✅ Texto extraído e cacheado: {len(full_text)} chars")
            else:
                logger.error(f"❌ Falha na extração PDF: {result.error}")
                supabase.table("radar_executions").update({
                    "status": "error",
                    "finished_at": datetime.now().isoformat(),
                    "error_message": f"Falha na extração: {result.error}"
                }).eq("id", exec_id).execute()
                return
        
        # 3. Extract promises using AI
        logger.info(f"🤖 Extraindo promessas com DeepSeek ({len(full_text)} chars)...")
        
        from src.services.ai_service import AIService
        ai = AIService()
        promessas_raw = ai.extract_promises_from_text(full_text)
        
        logger.info(f"📋 DeepSeek retornou {len(promessas_raw)} promessas")
        
        # 4. Save promises (delete existing first - idempotent)
        supabase.table("promises") \
            .delete() \
            .eq("campaign_id", campaign_id) \
            .eq("politico_id", politician_id) \
            .eq("mandate_id", mandate_id) \
            .eq("origem", "Plano de Governo") \
            .execute()
        
        inserted_count = 0
        for p in promessas_raw:
            promise_data = {
                "campaign_id": campaign_id,
                "politico_id": politician_id,
                "mandate_id": mandate_id,
                "resumo_promessa": (p.get("titulo", "") + " - " + p.get("descricao", ""))[:500],
                "categoria": p.get("area", "Outro"),
                "origem": "Plano de Governo",
                "source_type": "PLANO_GOVERNO",
                "data_promessa": datetime.now().date().isoformat()
            }
            if promise_data["resumo_promessa"]:
                supabase.table("promises").insert(promise_data).execute()
                inserted_count += 1
        
        # 5. Update execution log with success
        summary = {
            "status": "ok",
            "promises_count": inserted_count,
            "document": doc.get("filename"),
            "extracted_at": datetime.now().isoformat()
        }
        
        supabase.table("radar_executions").update({
            "status": "ok",
            "finished_at": datetime.now().isoformat(),
            "summary": summary
        }).eq("id", exec_id).execute()
        
        logger.info(f"✅ EXTRAÇÃO CONCLUÍDA. Promessas salvas: {inserted_count}")
        
    except Exception as e:
        logger.error(f"❌ ERRO NA EXTRAÇÃO BACKGROUND: {e}")
        supabase.table("radar_executions").update({
            "status": "error",
            "finished_at": datetime.now().isoformat(),
            "error_message": str(e)
        }).eq("id", exec_id).execute()


# ============ CAMPAIGN EXECUTION ENDPOINTS (Prefix: /campaigns) ============

@router.post("/api/campaigns/{campaign_id}/radar/{mandate_id}/phase1")
async def execute_phase1(
    campaign_id: UUID, 
    mandate_id: str,
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Force re-extraction even if promises exist")
):
    """
    Phase 1: Extract promises from government plan PDF.
    
    Uses fire-and-forget pattern with BackgroundTasks.
    Returns immediately with status "processing".
    
    Args:
        force: If True, re-extracts even if promises already exist
    """
    supabase = get_supabase_client()
    
    # 1. Get mandate details
    mandate_res = supabase.table("mandates").select("politician_id").eq("id", mandate_id).single().execute()
    if not mandate_res.data:
        raise HTTPException(status_code=404, detail="Mandate not found")
    
    politician_id = mandate_res.data["politician_id"]
    
    # 2. IDEMPOTENCY CHECK: Skip if promises already exist
    if not force:
        existing = supabase.table("promises") \
            .select("count", count="exact") \
            .eq("politico_id", politician_id) \
            .eq("mandate_id", mandate_id) \
            .eq("origem", "Plano de Governo") \
            .execute()
        
        if existing.count and existing.count > 0:
            return {
                "status": "exists",
                "message": f"Já existem {existing.count} promessas extraídas. Use 'Atualizar Radar' para cruzar com despesas, ou passe force=true para re-extrair.",
                "promises_count": existing.count,
                "action": "Use o botão 'Atualizar Radar' para correlacionar com despesas municipais."
            }
    
    # 3. Check if document exists
    docs_res = supabase.table("documents") \
        .select("id, filename") \
        .eq("person_id", politician_id) \
        .eq("doc_type", "government_plan") \
        .limit(1) \
        .execute()
    
    if not docs_res.data:
        raise HTTPException(
            status_code=404, 
            detail="Nenhum Plano de Governo encontrado. Faça upload do PDF primeiro."
        )
    
    doc = docs_res.data[0]
    
    # 4. Create execution log (status: "processing")
    exec_log = supabase.table("radar_executions").insert({
        "campaign_id": str(campaign_id),
        "mandate_id": mandate_id,
        "phase": "phase1",
        "status": "running"
    }).execute()
    
    exec_id = exec_log.data[0]["id"] if exec_log.data else None
    
    # 5. Dispatch background task
    logger.info(f"📤 Despachando extração em background para {doc.get('filename')}")
    
    background_tasks.add_task(
        _extract_promises_background,
        campaign_id=str(campaign_id),
        mandate_id=mandate_id,
        politician_id=politician_id,
        exec_id=exec_id
    )
    
    # 6. Return immediately
    return {
        "status": "running",
        "message": f"Extração iniciada em segundo plano para '{doc.get('filename')}'. Isso pode levar alguns minutos.",
        "execution_id": exec_id,
        "document": doc.get("filename"),
        "hint": "Atualize a página em 2-3 minutos para ver os resultados."
    }


# ============ PHASE 2 BACKGROUND TASK ============

def _process_phase2_background(
    campaign_id: str,
    mandate_id: str,
    politician_id: str,
    municipio_slug: str,
    exec_id: str,
    target_year: int = None
):
    """
    Background worker for Phase 2.
    """
    logger.info(f"🏗️ EXECUTANDO PHASE 2 BACKGROUND (ID: {exec_id}) para {municipio_slug}...")
    supabase = get_supabase_client()
    
    try:
        from src.services.radar_matcher import RadarMatcher
        
        matcher = RadarMatcher()
        
        # Determine year: if target_year provided, use it. Else default to now().year inside matcher.
        result = matcher.run_matching(
            politico_id=politician_id,
            municipio_slug=municipio_slug, 
            campaign_id=str(campaign_id),
            target_year=target_year
        )
        
        logger.info(f"📊 Matching concluído: {result.get('matches_found', 0)} matches")
        
        # Save summary to promise_budget_summaries
        summary_payload = {
            "matching_result": result,
            "data_sources": ["municipal_expenses"],
            "matcher_version": "v1.0"
        }
        
        try:
            supabase.table("promise_budget_summaries").insert({
                "campaign_id": campaign_id,
                "mandate_id": mandate_id,
                "payload_json": summary_payload
            }).execute()
        except Exception as e:
            logger.warning(f"⚠️ Erro ao salvar summary (não-crítico): {e}")
        
        # Update execution log
        supabase.table("radar_executions").update({
            "status": "ok",
            "finished_at": datetime.now().isoformat(),
            "summary": result
        }).eq("id", exec_id).execute()
        
        logger.info(f"✅ FASE 2 CONCLUÍDA. {result.get('matches_found', 0)} promessas correlacionadas.")
        
    except Exception as e:
        logger.error(f"❌ ERRO NA FASE 2 BACKGROUND: {e}")
        supabase.table("radar_executions").update({
            "status": "error",
            "finished_at": datetime.now().isoformat(),
            "error_message": str(e)
        }).eq("id", exec_id).execute()


# ============ PREVIEW ENDPOINT (LIVE DATA) ============

@router.get("/api/campaigns/{campaign_id}/radar/{mandate_id}/preview-expenses")
async def preview_expenses(
    campaign_id: UUID,
    mandate_id: str,
    year: int = 2025
):
    """
    Returns LIVE totals from TCESP API without saving to DB.
    Used for user validation before ingestion.
    """
    try:
        from src.services.tcesp_live import fetch_live_totals
        
        # We assume Votorantim for now, but could fetch city slug from mandate
        data = fetch_live_totals(year, "votorantim")
        
        return {
            "status": "success",
            "data": data,
            "message": "Dados obtidos diretamente do Portal TCESP (Tempo Real)."
        }
    except Exception as e:
        logger.error(f"Error in preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ PHASE 2 - DADOS OFICIAIS ============

@router.post("/api/campaigns/{campaign_id}/radar/{mandate_id}/phase2")
async def execute_phase2(
    campaign_id: UUID, 
    mandate_id: str,
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Force re-matching even if verifications exist"),
    target_year: int = Query(None, description="Year to analyze (default: current year)")
):
    """
    Phase 2: Data Sources (Official Data).
    
    Uses RadarMatcher to cross-reference promises with municipal expenses.
    Returns immediately and processes in background.
    """
    supabase = get_supabase_client()
    
    # 1. Get mandate details
    mandate = supabase.table("mandates").select("city_id, politician_id").eq("id", mandate_id).single().execute()
    if not mandate.data:
        raise HTTPException(status_code=404, detail="Mandate not found")
    
    politician_id = mandate.data["politician_id"]
    city_id = mandate.data.get("city_id")
    
    # 2. Get municipio_slug from city
    municipio_slug = "votorantim"  # Default
    if city_id:
        city = supabase.table("cities").select("slug").eq("id", city_id).limit(1).execute()
        if city.data:
            slug = city.data[0].get("slug", "votorantim")
            # Normalize: expenses use 'votorantim', city uses 'votorantim-sp'
            municipio_slug = slug.split('-')[0] if '-' in slug else slug
    
    # 3. IDEMPOTENCY CHECK: Skip if recent successful execution exists
    if not force:
        # Check if any recent phase2 execution exists with status=ok
        recent_exec = supabase.table("radar_executions") \
            .select("id, finished_at, summary") \
            .eq("mandate_id", mandate_id) \
            .eq("phase", "phase2") \
            .eq("status", "ok") \
            .order("finished_at", desc=True) \
            .limit(1) \
            .execute()
        
        if recent_exec.data:
            last_run = recent_exec.data[0]
            summary = last_run.get("summary") or {}
            matches = summary.get("matches_found", 0) if isinstance(summary, dict) else 0
            return {
                "status": "exists",
                "message": f"Cruzamento já realizado. {matches} promessas com evidências encontradas.",
                "last_run": last_run.get("finished_at"),
                "matches_found": matches,
                "summary": summary,
                "action": "Use force=true para re-processar ou veja os resultados abaixo."
            }
    
    # 4. Check if promises exist
    promises_check = supabase.table("promises") \
        .select("count", count="exact") \
        .eq("politico_id", politician_id) \
        .eq("mandate_id", mandate_id) \
        .execute()
    
    if not promises_check.count or promises_check.count == 0:
        raise HTTPException(
            status_code=400, 
            detail="Nenhuma promessa encontrada. Execute a Fase 1 (Extrair Promessas) primeiro."
        )
    
    # 5. Create execution log
    exec_log = supabase.table("radar_executions").insert({
        "campaign_id": str(campaign_id),
        "mandate_id": mandate_id,
        "phase": "phase2",
        "status": "running"
    }).execute()
    
    exec_id = exec_log.data[0]["id"] if exec_log.data else None
    
    # 6. Dispatch background task
    logger.info(f"📤 Despachando matching Fase 2 em background para {promises_check.count} promessas")
    
    background_tasks.add_task(
        _process_phase2_background,
        campaign_id=str(campaign_id),
        mandate_id=mandate_id,
        politician_id=politician_id,
        municipio_slug=municipio_slug,
        exec_id=exec_id,
        target_year=target_year
    )
    
    # 7. Return immediately
    return {
        "status": "running",
        "message": f"Cruzamento de dados iniciado para {promises_check.count} promessas. Isso pode levar alguns minutos.",
        "execution_id": exec_id,
        "promises_count": promises_check.count,
        "hint": "Atualize a página em 1-2 minutos para ver os resultados."
    }


# ============ PHASE 3 - MÍDIA/GOOGLE (BACKGROUND) ============

def _run_phase3_background(
    campaign_id: str,
    mandate_id: str,
    politician_name: str,
    city_name: str,
    agent_slug: str,
    exec_id: str,
    target_sites: List[str] = [],
    search_mode: str = "hybrid",
    max_results: int = 10
):
    """
    Background task for Phase 3 Media Scan.
    Executes the CrewAI agent and updates the execution status.
    """
    logger.info(f"🚀 INICIANDO VARREDURA PHASE 3 BACKGROUND com {agent_slug}...")
    supabase = get_supabase_client()
    
    try:
        from src.crew.radar_crew import RadarCrew
        
        # Initialize Crew with run_id for logging
        crew = RadarCrew(campaign_id=str(campaign_id), run_id=exec_id)
        
        # Execute the Agent
        # logs are automatically saved to agent_logs by the crew logger
        result = crew.run_google_scan(
            politician_name=politician_name,
            city_name=city_name,
            agent_name=agent_slug,
            target_sites=target_sites,
            search_mode=search_mode,
            max_results=max_results
        )
        
        # Update Execution with Success
        supabase.table("radar_executions").update({
            "status": "ok",
            "finished_at": datetime.now().isoformat(),
            "summary": result
        }).eq("id", exec_id).execute()
        
        logger.info(f"✅ VARREDURA CONCLUÍDA.")
        
    except Exception as e:
        logger.error(f"❌ ERRO NA VARREDURA BACKGROUND: {e}")
        supabase.table("radar_executions").update({
            "status": "error",
            "finished_at": datetime.now().isoformat(),
            "error_message": str(e)
        }).eq("id", exec_id).execute()


@router.post("/api/campaigns/{campaign_id}/radar/{mandate_id}/phase3")
async def execute_phase3(
    campaign_id: UUID, 
    mandate_id: str,
    background_tasks: BackgroundTasks,
    force: bool = Query(False),
    agent_slug: str = Query("radar-google-scanner", description="Slug name of the agent to use"),
    request_body: Phase3Request = Body(default=Phase3Request())
):
    """
    Phase 3: Media Scan (Google/Social).
    Executes via RadarCrew using the selected agent in background.
    """
    supabase = get_supabase_client()
    
    # Check existing execution
    if not force:
        existing = supabase.table("radar_executions") \
            .select("*") \
            .eq("mandate_id", mandate_id) \
            .eq("phase", "phase3") \
            .eq("status", "ok") \
            .execute()
            
        if existing.data:
            return existing.data[0]
            
    # Get Mandate Context
    mandate = supabase.table("mandates").select("*, politicians(name), cities(name)").eq("id", mandate_id).single().execute()
    if not mandate.data:
        raise HTTPException(status_code=404, detail="Mandate not found")
        
    politician_name = mandate.data["politicians"]["name"]
    city_name = mandate.data["cities"]["name"]

    # Create Execution Record (Running)
    exec_log = supabase.table("radar_executions").insert({
        "campaign_id": str(campaign_id),
        "mandate_id": mandate_id,
        "phase": "phase3",
        "status": "running",
        "started_at": datetime.now().isoformat()
    }).execute()
    
    if not exec_log.data:
        raise HTTPException(status_code=500, detail="Failed to initialize execution log")
        
    exec_id = exec_log.data[0]["id"]
    
    # Dispatch Background Task
    background_tasks.add_task(
        _run_phase3_background,
        campaign_id=str(campaign_id),
        mandate_id=mandate_id,
        politician_name=politician_name,
        city_name=city_name,
        agent_slug=agent_slug,
        exec_id=exec_id,
        target_sites=request_body.target_sites,
        search_mode=request_body.search_mode,
        max_results=request_body.max_results
    )
    
    return {
        "status": "running",
        "message": "Agente de Varredura iniciado. Acompanhe os logs no console.",
        "execution_id": exec_id,
        "agent": agent_slug
    }


# ============ LEGISLATIVE SUPPORT (Gestão Câmara) ============

class ChamberSupportUpdate(BaseModel):
    status: str = Field(..., pattern="^(base|oposicao|neutro)$")
    notes: Optional[str] = None

@router.get("/api/campaigns/{campaign_id}/chamber")
async def list_chamber_support(campaign_id: UUID):
    """
    List councilors (Vereadores) for the campaign's city,
    enriched with their support status (base/oposicao/neutro).
    """
    supabase = get_supabase_client()
    
    # 1. Get Campaign City
    # Note: Column is named 'city' (which stores the Name string), not 'city_id'
    camp = supabase.table("campaigns").select("city").eq("id", str(campaign_id)).single().execute()
    if not camp.data or not camp.data.get("city"):
         return []
    
    city_name = camp.data["city"]
    
    # Resolve City ID from Name
    city_res = supabase.table("cities").select("id").ilike("name", city_name).limit(1).execute()
    if not city_res.data:
        return []
        
    city_id = city_res.data[0]["id"]

    # 2. Get Councilors (Vereadores) for this city
    councilors_res = supabase.table("politicians") \
        .select("id, name, partido, slug, foto_url") \
        .eq("city_id", city_id) \
        .ilike("tipo", "%vereador%") \
        .order("name") \
        .execute()
        
    if not councilors_res.data:
        return []

    councilors = councilors_res.data
    councilor_ids = [c["id"] for c in councilors]

    # 3. Get Support Status
    support_map = {}
    try:
        support_res = supabase.table("legislative_support") \
            .select("politician_id, status, notes") \
            .eq("campaign_id", str(campaign_id)) \
            .in_("politician_id", councilor_ids) \
            .execute()
            
        support_map = {s["politician_id"]: s for s in support_res.data} if support_res.data else {}
    except Exception as e:
        print(f"⚠️ Legislative Support Fetch Failed: {e}")
        # Continue without support data (defaults to neutro)

    # 4. Merge
    result = []
    for c in councilors:
        sup = support_map.get(c["id"], {})
        result.append({
            "id": c["id"],
            "name": c["name"],
            "partido": c["partido"],
            "slug": c["slug"],
            "photograph": c.get("foto_url"),
            "status": sup.get("status", "neutro"), 
            "notes": sup.get("notes")
        })
        
    return result


@router.post("/api/campaigns/{campaign_id}/chamber/{politician_id}/status")
async def update_chamber_support(campaign_id: UUID, politician_id: str, payload: ChamberSupportUpdate):
    """
    Update support status for a councilor.
    """
    supabase = get_supabase_client()
    
    data = {
        "campaign_id": str(campaign_id),
        "politician_id": politician_id,
        "status": payload.status,
        "notes": payload.notes,
        "updated_at": datetime.now().isoformat()
    }
    
    # Upsert logic
    res = supabase.table("legislative_support").upsert(data, on_conflict="campaign_id, politician_id").execute()
    
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update status")
        
    return {"success": True, "data": res.data[0]}


@router.get("/api/mandates/{mandate_id}/document")
async def get_mandate_document(mandate_id: str):
    """
    Get the government plan document for a mandate.
    Returns document info if exists, null otherwise.
    """
    supabase = get_supabase_client()
    
    # Get politician_id from mandate
    mandate = supabase.table("mandates").select("politician_id").eq("id", mandate_id).single().execute()
    if not mandate.data:
        raise HTTPException(status_code=404, detail="Mandate not found")
    
    politician_id = mandate.data["politician_id"]
    
    # Get document
    doc = supabase.table("documents") \
        .select("id, filename, file_url, created_at, content_text") \
        .eq("person_id", politician_id) \
        .eq("doc_type", "government_plan") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not doc.data:
        return {"document": None}
    
    d = doc.data[0]
    has_text = bool(d.get("content_text") and len(d.get("content_text", "")) > 100)
    
    return {
        "document": {
            "id": d["id"],
            "filename": d["filename"],
            "file_url": d["file_url"],
            "created_at": d["created_at"],
            "has_text": has_text
        }
    }


@router.delete("/api/mandates/{mandate_id}/document/{doc_id}")
async def delete_mandate_document(mandate_id: str, doc_id: str):
    """
    Delete a government plan document.
    """
    supabase = get_supabase_client()
    
    # Verify ownership
    mandate = supabase.table("mandates").select("politician_id").eq("id", mandate_id).single().execute()
    if not mandate.data:
        raise HTTPException(status_code=404, detail="Mandate not found")
    
    politician_id = mandate.data["politician_id"]
    
    # Get document to verify ownership
    doc = supabase.table("documents") \
        .select("id, file_url") \
        .eq("id", doc_id) \
        .eq("person_id", politician_id) \
        .single() \
        .execute()
    
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found or not owned by this politician")
    
    # Delete from storage (extract path from URL)
    try:
        file_url = doc.data["file_url"]
        # URL format: .../government-plans/politician_id/filename
        if "government-plans" in file_url:
            path_part = file_url.split("government-plans/")[1].split("?")[0]
            supabase.storage.from_("government-plans").remove([path_part])
    except Exception as e:
        print(f"⚠️ Storage delete warning: {e}")
    
    # Delete from database
    supabase.table("documents").delete().eq("id", doc_id).execute()
    
    return {"success": True, "message": "Documento excluído com sucesso"}


@router.post("/campaigns/{campaign_id}/radar/{mandate_id}/upload-plan")
async def upload_government_plan(
    campaign_id: UUID, 
    mandate_id: str,
    file: UploadFile = File(...)
):
    """
    Uploads a Government Plan PDF manually.
    - Saves to Supabase Storage (bucket: government-plans)
    - Creates/Updates 'documents' record
    - Triggers immediate text extraction
    """
    supabase = get_supabase_client()
    
    # 1. Get Politician ID
    mandate = supabase.table("mandates").select("politician_id, politician:politicians(name)").eq("id", mandate_id).single().execute()
    if not mandate.data:
        raise HTTPException(status_code=404, detail="Mandate not found")
    
    politician_id = mandate.data["politician_id"]
    
    # 2. Upload to Storage
    try:
        file_content = await file.read()
        storage_path = f"{politician_id}/{file.filename}"
        
        # Check if exists (overwrite)
        list_res = supabase.storage.from_("government-plans").list(politician_id)
        exists = any(f["name"] == file.filename for f in list_res)
        
        if exists:
             supabase.storage.from_("government-plans").update(
                path=storage_path,
                file=file_content,
                file_options={"content-type": "application/pdf"}
            )
        else:
            supabase.storage.from_("government-plans").upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": "application/pdf"}
            )
            
        # Get Public URL
        public_url = supabase.storage.from_("government-plans").get_public_url(storage_path)
        
    except Exception as e:
        print(f"❌ Storage Upload Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file to storage: {str(e)}")
        
    # 3. Upsert Document Record
    try:
        # Check if doc exists
        existing_doc = supabase.table("documents") \
            .select("id") \
            .eq("person_id", politician_id) \
            .eq("doc_type", "government_plan") \
            .execute()
            
        doc_data = {
            "person_id": politician_id,
            "campaign_id": str(campaign_id),
            "doc_type": "government_plan",
            "filename": file.filename,
            "file_url": public_url
        }
        
        doc_id = None
        if existing_doc.data:
            doc_id = existing_doc.data[0]["id"]
            supabase.table("documents").update(doc_data).eq("id", doc_id).execute()
        else:
            res = supabase.table("documents").insert(doc_data).execute()
            doc_id = res.data[0]["id"]
            
        # 4. Immediate Extraction
        from src.services.pdf_service import PDFExtractionService
        service = PDFExtractionService()
        result = service.extract_text(public_url)
        
        if result.success and len(result.text) > 100:
             supabase.table("documents").update({"content_text": result.text}).eq("id", doc_id).execute()
             return {"message": "Upload e extração realizados com sucesso!", "text_preview": result.text[:100]}
        else:
             return {"message": "Upload realizado, mas extração falhou (PDF Imagem?)", "warning": result.error}
             
    except Exception as e:
        print(f"❌ Database/Extraction Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload saved but registration failed: {str(e)}")
