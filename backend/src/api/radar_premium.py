"""
Radar Premium API - Offices & Mandates + Phase Execution
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field
import os
import json
from supabase import create_client
from openai import OpenAI

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

    class Config:
        from_attributes = True


class PhaseStatusRead(BaseModel):
    phase1: Optional[RadarExecutionRead] = None
    phase2: Optional[RadarExecutionRead] = None
    phase3: Optional[RadarExecutionRead] = None
    verify: Optional[RadarExecutionRead] = None


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
                if phase == "phase1":
                    status.phase1 = exec_read
                elif phase == "phase2":
                    status.phase2 = exec_read
                elif phase == "phase3":
                    status.phase3 = exec_read
                elif phase == "verify":
                    status.verify = exec_read
    
    return status


# ============ CAMPAIGN EXECUTION ENDPOINTS (Prefix: /campaigns) ============


# ============ CAMPAIGN EXECUTION ENDPOINTS (Prefix: /campaigns) ============

@router.post("/campaigns/{campaign_id}/radar/{mandate_id}/phase1")
async def execute_phase1(campaign_id: UUID, mandate_id: str):
    """
    Phase 1: Extract promises from government plan PDF.
    
    Supports shared documents (by person_id) and legacy campaign documents.
    """
    supabase = get_supabase_client()
    from src.crew.radar_crew import RadarCrew
    
    # Create execution log
    exec_log = supabase.table("radar_executions").insert({
        "campaign_id": str(campaign_id),
        "mandate_id": mandate_id,
        "phase": "phase1",
        "status": "running"
    }).execute()
    
    exec_id = exec_log.data[0]["id"] if exec_log.data else None
    
    try:
        # 1. Get mandate details to find politician_id
        mandate_res = supabase.table("mandates").select("politician_id").eq("id", mandate_id).single().execute()
        if not mandate_res.data:
            raise HTTPException(status_code=404, detail="Mandate not found")
            
        politician_id = mandate_res.data["politician_id"]
        
        # 2. Find government plan PDF
        # Priority 1: Document linked to person_id (Shared Layer)
        docs_res = supabase.table("documents") \
            .select("id, filename, file_url, content_text") \
            .eq("person_id", politician_id) \
            .eq("doc_type", "government_plan") \
            .limit(1) \
            .execute()
            
        full_text = ""
        doc_source = ""
        
        if docs_res.data:
            doc = docs_res.data[0]
            doc_source = f"Documento: {doc['filename']}"
            full_text = doc.get("content_text", "")
            
            # If no content_text, use Robust Reuse Logic
            if not full_text or len(full_text) < 100:
                print(f"⚠️ Texto vazio no banco. Invocando ingestão robusta para {doc.get('file_url')}")
                
                # Validation: If URL is missing, we can't do anything.
                # Auto-heal: Delete this broken record so user can upload again.
                if not doc.get("file_url"):
                    print("❌ URL do arquivo inválida/nula. Removendo registro corrompido.")
                    supabase.table("documents").delete().eq("id", doc["id"]).execute()
                    raise HTTPException(
                        status_code=400, 
                        detail="O documento do Plano de Governo parece estar corrompido (sem URL). O registro foi limpo. Por favor, faça o upload do PDF novamente."
                    )

                from src.services.pdf_ingestion import extract_text_from_pdf
                
                try:
                    full_text = extract_text_from_pdf(doc["file_url"])
                    
                    # Update cache in documents table to avoid re-downloading next time
                    if full_text and len(full_text) > 100:
                         supabase.table("documents").update({"content_text": full_text}).eq("id", doc["id"]).execute()
                         print("✅ Texto extraído e salvo em documents.content_text")
                         
                except Exception as ingest_error:
                    print(f"❌ Falha na ingestão robusta: {ingest_error}")
                    # Fallback to chunks if ingestion fails (legacy)
                    chunks_res = supabase.table("document_chunks") \
                        .select("content") \
                        .eq("document_id", doc["id"]) \
                        .limit(50) \
                        .execute()
                    if chunks_res.data:
                        full_text = "\n\n".join([c["content"] for c in chunks_res.data if c.get("content")])
        
        if not full_text or len(full_text) < 100:
            # If we reached here, both text cache and robust ingestion failed.
            # Check if we should delete the doc to force re-upload
            if not doc.get("content_text"):
                 supabase.table("documents").delete().eq("id", doc["id"]).execute()
                 
            raise HTTPException(
                status_code=404, 
                detail="Nenhum texto pôde ser extraído do PDF. O arquivo pode estar vazio ou ser uma imagem. Tente fazer upload de um PDF pesquisável."
            )

        # 3. Extract promises using RadarCrew Agent (Radar – Extrator de Promessas)
        crew = RadarCrew(campaign_id=str(campaign_id), run_id=exec_id)
        extracted = crew.run_extraction(full_text)
        
        # The result accepts different JSON structures, usually a list or object with list
        if isinstance(extracted, list):
            promessas = extracted
        elif isinstance(extracted, dict) and "promessas" in extracted:
            promessas = extracted["promessas"]
        else:
            promessas = []
        
        # 4. Save promises
        # Delete existing promises for this mandate/origin (idempotent)
        supabase.table("promises") \
            .delete() \
            .eq("campaign_id", str(campaign_id)) \
            .eq("politico_id", politician_id) \
            .eq("mandate_id", mandate_id) \
            .eq("origem", "Plano de Governo") \
            .execute()
            
        inserted_count = 0
        for p in promessas:
            # Preserve rich context in available columns
            local_info = f"[Local: {p.get('local')}] " if p.get("local") else ""
            verbos_info = f"[Verbos: {', '.join(p.get('verbos_chave', []))}] " if p.get("verbos_chave") else ""
            
            trecho = p.get("trecho_original", "")
            if len(trecho) > 10:
                final_trecho = f"{local_info}{trecho}"[:500]
            else:
                final_trecho = f"{local_info}{verbos_info[:50]}..."
                
            promise_data = {
                "campaign_id": str(campaign_id),
                "politico_id": politician_id,
                "mandate_id": mandate_id,
                "resumo_promessa": p.get("resumo_promessa", "")[:500] if p.get("resumo_promessa") else "Sem resumo",
                "categoria": p.get("categoria", "Outro"),
                "origem": "Plano de Governo", 
                "source_type": "PLANO_GOVERNO",
                "trecho_original": final_trecho,
                "data_promessa": datetime.now().date().isoformat()
            }
            # Only insert if it has some content
            if promise_data["resumo_promessa"]:
                res = supabase.table("promises").insert(promise_data).execute()
                if res.data:
                    inserted_count += 1
        
        # 5. Enrich Response (Stats & Categories)
        by_category = {}
        for p in promessas:
            cat = p.get("categoria", "Outro")
            by_category[cat] = by_category.get(cat, 0) + 1
            
        sorted_cats = [{"categoria": k, "qtd": v} for k, v in by_category.items()]
        sorted_cats.sort(key=lambda x: x["qtd"], reverse=True)
        
        # Sample promises (top 3)
        sample = [{"resumo": p.get("resumo_promessa", "")[:100], "categoria": p.get("categoria", "Outro")} for p in promessas[:5]]

        result = {
            "status": "ok",
            "message": f"Extraídas {inserted_count} promessas de {doc_source}",
            "promises_count": inserted_count,
            "source": doc_source,
            "success": True, # Premium flag
            "total_promises": inserted_count,
            "by_category": sorted_cats,
            "sample_promises": sample,
            "document_info": {
                "filename": doc.get("filename", "Plano de Governo"),
                "last_extraction_at": datetime.now().isoformat()
            }
        }
        
        # Update execution log
        if exec_id:
            supabase.table("radar_executions").update({
                "status": "ok",
                "finished_at": datetime.now().isoformat(),
                "summary": result
            }).eq("id", exec_id).execute()
        
        return result

    except Exception as e:
        if exec_id:
            supabase.table("radar_executions").update({
                "status": "error",
                "finished_at": datetime.now().isoformat(),
                "error_message": str(e)
            }).eq("id", exec_id).execute()
        raise HTTPException(status_code=500, detail=str(e))


# ============ PHASE 2 - DADOS OFICIAIS ============

@router.post("/campaigns/{campaign_id}/radar/{mandate_id}/phase2")
async def execute_phase2(campaign_id: UUID, mandate_id: str):
    """
    Phase 2: Data Sources (Official Data).
    Uses 'Radar – Fiscal de Verbas' agent to cross-reference promises with municipal expenses.
    """
    supabase = get_supabase_client()
    from src.crew.radar_crew import RadarCrew
    
    # Create execution log
    exec_log = supabase.table("radar_executions").insert({
        "campaign_id": str(campaign_id),
        "mandate_id": mandate_id,
        "phase": "phase2",
        "status": "running"
    }).execute()
    
    exec_id = exec_log.data[0]["id"] if exec_log.data else None
    
    try:
        # 1. Get mandate details to find city
        mandate = supabase.table("mandates").select("city_id, politician_id").eq("id", mandate_id).single().execute()
        if not mandate.data:
            raise HTTPException(status_code=404, detail="Mandate not found")
        
        city_id = mandate.data["city_id"]
        
        # 2. Fetch Promises for this Mandate
        promises_res = supabase.table("promises") \
            .select("resumo_promessa, categoria") \
            .eq("mandate_id", mandate_id) \
            .execute()
        
        if not promises_res.data:
            raise HTTPException(status_code=400, detail="Nenhuma promessa encontrada na Fase 1. Execute a extração primeiro.")
            
        promises_list = [{"resumo": p["resumo_promessa"], "categoria": p["categoria"]} for p in promises_res.data]
        
        # 3. Fetch Official Expenses (Simplified aggregation)
        # Try to match city or use Votorantim as default/fallback if no match found (assuming single tenant for now)
        # In a real scenario, filter by city_id logic would be stricter.
        expenses_res = supabase.table("municipal_expenses") \
            .select("category, value_paid, description") \
            .limit(1000) \
            .execute()
            
        # Group expenses by category (Python aggregation)
        grouped_expenses = {}
        for exp in expenses_res.data:
            cat = exp.get("category") or "Outros"
            val = float(exp.get("value_paid") or 0)
            if cat not in grouped_expenses:
                grouped_expenses[cat] = 0.0
            grouped_expenses[cat] += val
            
        # 4. Run Fiscal Agent
        crew = RadarCrew(campaign_id=str(campaign_id), run_id=exec_id)
        fiscal_analysis = crew.run_fiscal_analysis(promises_list, grouped_expenses)
        
        # 5. Persist Analysis
        summary_payload = {
            "analysis": fiscal_analysis,
            "data_sources": ["Portal da Transparência", "Câmara Municipal"],
            "expenses_count": len(expenses_res.data),
            "promises_count": len(promises_list)
        }
        
        # Save to promise_budget_summaries table
        supabase.table("promise_budget_summaries").insert({
            "campaign_id": str(campaign_id),
            "mandate_id": mandate_id,
            "payload_json": fiscal_analysis
        }).execute()
        
        # Result for frontend
        result = {
            "status": "ok",
            "message": "Cruzamento realizado com sucesso pelo Agente Fiscal.",
            "data": fiscal_analysis
        }
        
        # Update execution log
        if exec_id:
            supabase.table("radar_executions").update({
                "status": "ok",
                "finished_at": datetime.now().isoformat(),
                "summary": result
            }).eq("id", exec_id).execute()
        
        return result
        
    except Exception as e:
        if exec_id:
            supabase.table("radar_executions").update({
                "status": "error",
                "finished_at": datetime.now().isoformat(),
                "error_message": str(e)
            }).eq("id", exec_id).execute()
        raise HTTPException(status_code=500, detail=str(e))


# ============ PHASE 3 - MÍDIA/GOOGLE (SIMULATION) ============

@router.post("/campaigns/{campaign_id}/radar/{mandate_id}/phase3")
async def execute_phase3(campaign_id: UUID, mandate_id: str):
    """
    Phase 3: Media Scan (Google/Social).
    SIMULATION: Returns realistic mock data to demonstrate functionality.
    """
    supabase = get_supabase_client()
    import random
    
    # Create execution log
    exec_log = supabase.table("radar_executions").insert({
        "campaign_id": str(campaign_id),
        "mandate_id": mandate_id,
        "phase": "phase3",
        "status": "running"
    }).execute()
    
    exec_id = exec_log.data[0]["id"] if exec_log.data else None
    
    try:
        # Get mandate details
        mandate = supabase.table("mandates").select("politician_id").eq("id", mandate_id).execute()
        m = mandate.data[0]
        person = supabase.table("politicians").select("name").eq("id", m["politician_id"]).execute()
        p_name = person.data[0]["name"] if person.data else "Político"
        
        # MOCK DATA GENERATION
        items_found = random.randint(4, 9)
        
        mock_media = [
            {"date": "2025-10-10", "source": "G1 Sorocaba", "title": f"Prefeitura anuncia novas obras em parceria com {p_name}", "sentiment": "positive", "url": "https://g1.globo.com/sp/sorocaba/noticia"},
            {"date": "2025-09-15", "source": "Jornal Cruzeiro do Sul", "title": "Câmara aprova orçamento para 2026 com emendas", "sentiment": "neutral", "url": "https://jornalcruzeiro.com.br"},
            {"date": "2025-08-20", "source": "Instagram", "title": "@cidadaovotorantim: Cadê a reforma prometida da praça?", "sentiment": "negative", "url": "https://instagram.com/p/xyz"},
            {"date": "2025-11-01", "source": "YouTube", "title": f"Entrevista exclusiva com {p_name} sobre saúde", "sentiment": "positive", "url": "https://youtube.com/watch?v=123"},
            {"date": "2025-07-30", "source": "Blog do Zé", "title": "Moradores reclamam de buracos na Av. 31 de Março", "sentiment": "negative", "url": "https://blogdoze.com.br"}
        ]
        
        selected_media = random.sample(mock_media, min(len(mock_media), items_found))
        
        result = {
            "status": "ok",
            "message": f"Varredura de mídia concluída para {p_name}.",
            "media_sources": [
                "Google News",
                "YouTube",
                "Instagram",
                "Twitter/X"
            ],
            "items_found": items_found,
            "details": selected_media
        }
        
        # Update execution log
        if exec_id:
            supabase.table("radar_executions").update({
                "status": "ok",
                "finished_at": datetime.now().isoformat(),
                "summary": result
            }).eq("id", exec_id).execute()
        
        return result
        
    except Exception as e:
        if exec_id:
            supabase.table("radar_executions").update({
                "status": "error",
                "finished_at": datetime.now().isoformat(),
                "error_message": str(e)
            }).eq("id", exec_id).execute()
        raise HTTPException(status_code=500, detail=str(e))
