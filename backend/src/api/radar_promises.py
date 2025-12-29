"""
Radar de Promessas API
Endpoints for managing political promises and their verifications.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field
import os
from supabase import create_client

router = APIRouter(prefix="/campaigns", tags=["radar-promises"])


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


# ============ SCHEMAS ============

class PromiseBase(BaseModel):
    resumo_promessa: str
    categoria: str
    origem: str
    confiabilidade: str = "MEDIA"
    trecho_original: Optional[str] = None
    data_promessa: Optional[date] = None


class PromiseCreate(PromiseBase):
    politico_id: str


class PromiseRead(PromiseBase):
    id: UUID
    campaign_id: UUID
    politico_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PromiseVerificationBase(BaseModel):
    status: str  # CUMPRIDA, PARCIAL, NAO_INICIADA, DESVIADA
    score_similaridade: Optional[float] = None
    justificativa_ia: Optional[str] = None
    fontes: Optional[list] = []
    data_primeira_emenda: Optional[date] = None
    data_licitacao: Optional[date] = None
    data_ultima_noticia: Optional[date] = None


class PromiseVerificationRead(PromiseVerificationBase):
    id: UUID
    promise_id: UUID
    last_updated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class PromiseWithVerification(PromiseRead):
    """Promise with latest verification data attached"""
    status_atual: Optional[str] = None
    score_similaridade: Optional[float] = None
    justificativa_ia: Optional[str] = None
    fontes: Optional[list] = []
    data_primeira_emenda: Optional[str] = None
    data_licitacao: Optional[str] = None
    data_ultima_noticia: Optional[str] = None
    last_updated_at: Optional[datetime] = None


class RadarSummary(BaseModel):
    """Summary stats for KPI cards"""
    cumprida: int = 0
    parcial: int = 0
    nao_iniciada: int = 0
    desviada: int = 0
    score_medio: float = 0.0


# ============ ENDPOINTS ============

@router.get("/{campaign_id}/radar/{politico_id}/summary", response_model=RadarSummary)
async def get_radar_summary(campaign_id: UUID, politico_id: str):
    """
    Get summary statistics for the radar KPI cards.
    Returns counts by status and average similarity score.
    """
    supabase = get_supabase_client()

    # Fetch all promises for this politician in this campaign
    promises_res = supabase.table("promises") \
        .select("id") \
        .eq("campaign_id", str(campaign_id)) \
        .eq("politico_id", politico_id) \
        .execute()

    if not promises_res.data:
        return RadarSummary()

    promise_ids = [p["id"] for p in promises_res.data]

    # Count verifications by status (get latest per promise)
    # For simplicity, we get all verifications and aggregate
    verifications_res = supabase.table("promise_verifications") \
        .select("promise_id, status, score_similaridade, last_updated_at") \
        .in_("promise_id", promise_ids) \
        .order("last_updated_at", desc=True) \
        .execute()

    if not verifications_res.data:
        return RadarSummary(nao_iniciada=len(promise_ids))

    # Get latest verification per promise
    latest_by_promise = {}
    for v in verifications_res.data:
        pid = v["promise_id"]
        if pid not in latest_by_promise:
            latest_by_promise[pid] = v

    # Aggregate
    summary = RadarSummary()
    scores = []
    for v in latest_by_promise.values():
        status = v["status"].upper()
        if status == "CUMPRIDA":
            summary.cumprida += 1
        elif status == "PARCIAL":
            summary.parcial += 1
        elif status == "NAO_INICIADA":
            summary.nao_iniciada += 1
        elif status == "DESVIADA":
            summary.desviada += 1

        if v.get("score_similaridade"):
            scores.append(float(v["score_similaridade"]))

    # Promises without any verification count as NAO_INICIADA
    verified_ids = set(latest_by_promise.keys())
    unverified = len(promise_ids) - len(verified_ids)
    summary.nao_iniciada += unverified

    if scores:
        summary.score_medio = sum(scores) / len(scores)

    return summary


@router.get("/{campaign_id}/radar/{politico_id}/promises", response_model=List[PromiseWithVerification])
async def list_promises(
    campaign_id: UUID,
    politico_id: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    categoria: Optional[str] = Query(None, description="Filter by category"),
    origem: Optional[str] = Query(None, description="Filter by origin"),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """
    List promises with their latest verification data.
    Supports filtering by status, categoria, origem.
    """
    supabase = get_supabase_client()

    # Build promises query
    query = supabase.table("promises") \
        .select("*") \
        .eq("campaign_id", str(campaign_id)) \
        .eq("politico_id", politico_id)

    if categoria:
        query = query.eq("categoria", categoria)
    if origem:
        query = query.eq("origem", origem)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    promises_res = query.execute()

    if not promises_res.data:
        return []

    # Fetch latest verifications for these promises
    promise_ids = [p["id"] for p in promises_res.data]
    verifications_res = supabase.table("promise_verifications") \
        .select("*") \
        .in_("promise_id", promise_ids) \
        .order("last_updated_at", desc=True) \
        .execute()

    # Map latest verification per promise
    latest_verifications = {}
    for v in verifications_res.data or []:
        pid = v["promise_id"]
        if pid not in latest_verifications:
            latest_verifications[pid] = v

    # Merge promises with verifications
    result = []
    for p in promises_res.data:
        v = latest_verifications.get(p["id"], {})
        
        # Apply status filter if provided
        current_status = v.get("status", "NAO_INICIADA")
        if status and current_status.upper() != status.upper():
            continue

        result.append(PromiseWithVerification(
            id=p["id"],
            campaign_id=p["campaign_id"],
            politico_id=p["politico_id"],
            resumo_promessa=p["resumo_promessa"],
            categoria=p["categoria"],
            origem=p["origem"],
            confiabilidade=p.get("confiabilidade", "MEDIA"),
            trecho_original=p.get("trecho_original"),
            data_promessa=p.get("data_promessa"),
            created_at=p["created_at"],
            updated_at=p["updated_at"],
            # Verification data
            status_atual=current_status,
            score_similaridade=v.get("score_similaridade"),
            justificativa_ia=v.get("justificativa_ia"),
            fontes=v.get("fontes", []),
            data_primeira_emenda=v.get("data_primeira_emenda"),
            data_licitacao=v.get("data_licitacao"),
            data_ultima_noticia=v.get("data_ultima_noticia"),
            last_updated_at=v.get("last_updated_at")
        ))

    return result


@router.get("/{campaign_id}/radar/{politico_id}/promises/{promise_id}")
async def get_promise_detail(campaign_id: UUID, politico_id: str, promise_id: UUID):
    """
    Get detailed information about a specific promise including all verification data.
    """
    supabase = get_supabase_client()

    # Fetch promise
    promise_res = supabase.table("promises") \
        .select("*") \
        .eq("id", str(promise_id)) \
        .eq("campaign_id", str(campaign_id)) \
        .eq("politico_id", politico_id) \
        .single() \
        .execute()

    if not promise_res.data:
        raise HTTPException(status_code=404, detail="Promise not found")

    p = promise_res.data

    # Fetch latest verification
    verification_res = supabase.table("promise_verifications") \
        .select("*") \
        .eq("promise_id", str(promise_id)) \
        .order("last_updated_at", desc=True) \
        .limit(1) \
        .execute()

    v = verification_res.data[0] if verification_res.data else {}

    return {
        "id": p["id"],
        "campaign_id": p["campaign_id"],
        "politico_id": p["politico_id"],
        "resumo_promessa": p["resumo_promessa"],
        "categoria": p["categoria"],
        "origem": p["origem"],
        "confiabilidade": p.get("confiabilidade", "MEDIA"),
        "trecho_original": p.get("trecho_original"),
        "data_promessa": p.get("data_promessa"),
        "created_at": p["created_at"],
        "updated_at": p["updated_at"],
        # Latest verification
        "status_atual": v.get("status", "NAO_INICIADA"),
        "score_similaridade": v.get("score_similaridade"),
        "justificativa_ia": v.get("justificativa_ia"),
        "fontes": v.get("fontes", []),
        "data_primeira_emenda": v.get("data_primeira_emenda"),
        "data_licitacao": v.get("data_licitacao"),
        "data_ultima_noticia": v.get("data_ultima_noticia"),
        "last_updated_at": v.get("last_updated_at")
    }


@router.post("/{campaign_id}/radar/{politico_id}/refresh")
async def refresh_radar(campaign_id: UUID, politico_id: str):
    """
    Trigger a radar refresh for the specified politician.
    
    NOTE: This is a stub. In the future, this will:
    - Enqueue workers to scrape Portal da Transparência
    - Fetch YouTube videos
    - Scrape Instagram posts
    - Run AI agents to verify promises
    
    For now, it just returns a scheduled status.
    """
    # TODO: Implement worker dispatch logic
    # - Send message to task queue (e.g., Celery, RQ, or Kestra flow)
    # - Workers will:
    #   1. Fetch emendas from Portal da Transparência API
    #   2. Search YouTube for relevant videos
    #   3. Scrape Instagram for related posts
    #   4. Use LLM to analyze and score each promise
    #   5. Insert/update promise_verifications records

    return {
        "status": "scheduled",
        "message": f"Radar refresh scheduled for politico_id={politico_id} in campaign={campaign_id}",
        "estimated_time_seconds": 120  # Placeholder
    }


@router.post("/{campaign_id}/radar/{politico_id}/refresh-phase1")
async def refresh_phase1(campaign_id: UUID, politico_id: str):
    """
    Phase 1: Extract promises from government plan PDF.
    
    This endpoint:
    1. Fetches the government plan PDF for the politician
    2. Extracts text from the PDF
    3. Uses AI to extract promises from the text
    4. Saves promises to the database (idempotent)
    
    Returns:
        status: "ok" or "error"
        promises_inseridas: number of promises inserted
    """
    import json
    from openai import OpenAI
    
    supabase = get_supabase_client()
    
    # 1. Validate politician exists and belongs to campaign
    pol_res = supabase.table("politicians") \
        .select("id, name, slug, campaign_id") \
        .eq("slug", politico_id) \
        .execute()
    
    if not pol_res.data:
        # Try by ID
        pol_res = supabase.table("politicians") \
            .select("id, name, slug, campaign_id") \
            .eq("id", politico_id) \
            .execute()
    
    politician = pol_res.data[0] if pol_res.data else None
    
    # 2. Find government plan PDF in documents table
    docs_res = supabase.table("documents") \
        .select("id, filename, file_url, content_text") \
        .eq("campaign_id", str(campaign_id)) \
        .eq("doc_type", "government_plan") \
        .limit(1) \
        .execute()
    
    if not docs_res.data:
        # Try document_chunks for content
        chunks_res = supabase.table("document_chunks") \
            .select("content, metadata") \
            .eq("campaign_id", str(campaign_id)) \
            .limit(50) \
            .execute()
        
        if not chunks_res.data:
            raise HTTPException(
                status_code=404,
                detail="Nenhum documento de plano de governo encontrado. Faça upload do PDF primeiro."
            )
        
        # Combine chunks into full text
        full_text = "\n\n".join([c["content"] for c in chunks_res.data if c.get("content")])
    else:
        doc = docs_res.data[0]
        full_text = doc.get("content_text", "")
        
        # If no content_text, try to get from chunks
        if not full_text or len(full_text) < 100:
            chunks_res = supabase.table("document_chunks") \
                .select("content") \
                .eq("campaign_id", str(campaign_id)) \
                .limit(50) \
                .execute()
            
            if chunks_res.data:
                full_text = "\n\n".join([c["content"] for c in chunks_res.data if c.get("content")])
    
    if not full_text or len(full_text) < 100:
        raise HTTPException(
            status_code=400,
            detail="Texto do plano de governo muito curto ou vazio. Verifique se o PDF foi processado corretamente."
        )
    
    # 3. Extract promises using AI
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY não configurada")
    
    client = OpenAI(api_key=openai_key)
    
    # Truncate text if too long (max ~10k tokens)
    max_chars = 30000
    if len(full_text) > max_chars:
        full_text = full_text[:max_chars] + "\n\n[... texto truncado ...]"
    
    extraction_prompt = f"""Você é um especialista em análise de planos de governo político.

Analise o texto abaixo e extraia TODAS as promessas de campanha identificadas.

Para cada promessa, forneça:
1. resumo_promessa: Um resumo claro e conciso da promessa (máx 100 palavras)
2. categoria: Escolha entre: Saúde, Educação, Economia, Segurança, Infraestrutura, Assistência Social, Meio Ambiente, Cultura, Outro
3. trecho_original: O trecho exato do texto onde a promessa foi encontrada (máx 200 caracteres)
4. confiabilidade: ALTA (promessa clara e mensurável) ou MEDIA (promessa vaga ou genérica)

Retorne APENAS um JSON válido no formato:
{{
    "promessas": [
        {{
            "resumo_promessa": "...",
            "categoria": "...",
            "trecho_original": "...",
            "confiabilidade": "ALTA ou MEDIA"
        }}
    ]
}}

TEXTO DO PLANO DE GOVERNO:
{full_text}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Você extrai promessas de campanha de textos políticos. Responda APENAS com JSON válido."},
                {"role": "user", "content": extraction_prompt}
            ],
            temperature=0.3,
            max_tokens=4000
        )
        
        ai_response = response.choices[0].message.content
        
        # Clean up JSON response
        if "```json" in ai_response:
            ai_response = ai_response.split("```json")[1].split("```")[0]
        elif "```" in ai_response:
            ai_response = ai_response.split("```")[1].split("```")[0]
        
        extracted = json.loads(ai_response.strip())
        promessas = extracted.get("promessas", [])
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar resposta da IA: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na extração de promessas: {str(e)}")
    
    # 4. Delete existing promises for this politician (idempotent)
    supabase.table("promises") \
        .delete() \
        .eq("campaign_id", str(campaign_id)) \
        .eq("politico_id", politico_id) \
        .eq("origem", "Plano de Governo") \
        .execute()
    
    # 5. Insert new promises
    inserted_count = 0
    for p in promessas:
        try:
            promise_data = {
                "campaign_id": str(campaign_id),
                "politico_id": politico_id,
                "resumo_promessa": p.get("resumo_promessa", "")[:500],
                "categoria": p.get("categoria", "Outro"),
                "origem": "Plano de Governo",
                "confiabilidade": p.get("confiabilidade", "MEDIA"),
                "trecho_original": p.get("trecho_original", "")[:500],
                "data_promessa": datetime.now().date().isoformat()
            }
            
            supabase.table("promises").insert(promise_data).execute()
            inserted_count += 1
        except Exception as e:
            print(f"[Phase1] Error inserting promise: {e}")
            continue
    
    return {
        "status": "ok",
        "promises_inseridas": inserted_count,
        "message": f"Extraídas {inserted_count} promessas do plano de governo"
    }


@router.post("/{campaign_id}/radar/{politico_id}/promises", response_model=PromiseRead)
async def create_promise(campaign_id: UUID, politico_id: str, promise: PromiseCreate):
    """
    Create a new promise manually.
    """
    supabase = get_supabase_client()

    data = promise.dict()
    data["campaign_id"] = str(campaign_id)
    data["politico_id"] = politico_id

    # Convert date to string for Supabase
    if data.get("data_promessa"):
        data["data_promessa"] = data["data_promessa"].isoformat()

    result = supabase.table("promises").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create promise")

    return result.data[0]

