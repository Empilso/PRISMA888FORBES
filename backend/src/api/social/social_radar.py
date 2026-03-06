"""
API Router: Social Radar
Monitor Tático de Redes Sociais — GeoInteligência Social
=========================================================
Endpoints para scraping, consulta e micro-estratégia baseada em menções sociais.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api", tags=["social-radar"])


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


# =============================================================================
# MODELS
# =============================================================================
class ScrapeResponse(BaseModel):
    success: bool
    mentions_count: int
    source: str
    city: str
    message: str


class MicroStrategyRequest(BaseModel):
    neighborhood: str
    location_name: Optional[str] = None
    location_id: Optional[str] = None
    additional_context: Optional[str] = None


class MicroStrategyResponse(BaseModel):
    success: bool
    diagnostico: str
    estrategia_tato: str
    conteudo_sugerido: str
    tarefa_delega: str
    neighborhood: str
    data_points: int


class MentionOut(BaseModel):
    id: str
    platform: str
    author: str
    text: str
    sentiment: Optional[int]
    sentiment_label: Optional[str]
    inferred_neighborhood: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    rival_handle: Optional[str]
    is_mock: bool
    created_at: Optional[str]


class TacticalMapData(BaseModel):
    mentions: list[dict]
    locations_summary: list[dict]
    total_mentions: int
    sentiment_breakdown: dict
    monitored_targets: list[str] = [] # NEW: Alvos reais do setup


class DelegateTaskRequest(BaseModel):
    mention_id: str
    diagnostico: str
    estrategia_tato: str
    conteudo_sugerido: str
    tarefa_delega: str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/campaign/{campaign_id}/social/scrape", response_model=ScrapeResponse)
async def trigger_social_scrape(campaign_id: str, max_posts: Optional[int] = 10):
    """
    Dispara scraping das redes sociais dos rivais.
    max_posts: Limite de posts por alvo para economia de créditos.
    """
    try:
        from src.tools.social_tools import SocialRadarPipeline
        pipeline = SocialRadarPipeline()
        result = await pipeline.execute(campaign_id, max_posts=max_posts)

        return ScrapeResponse(
            success=result["success"],
            mentions_count=result["mentions_count"],
            source=result["source"],
            city=result["city"],
            message=result["message"]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"[SocialRadar] ❌ Erro no scrape: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign/{campaign_id}/social/mentions")
async def list_social_mentions(
    campaign_id: str,
    sentiment: Optional[str] = None,
    neighborhood: Optional[str] = None,
    bounds: Optional[str] = None,
    limit: int = 200
):
    """
    Lista menções sociais reais.
    bounds: "sw_lat,sw_lng,ne_lat,ne_lng"
    """
    supabase = get_supabase_client()

    query = supabase.table("social_mentions") \
        .select("*") \
        .eq("campaign_id", campaign_id) \
        .order("created_at", desc=True) \
        .limit(limit)

    if sentiment:
        query = query.eq("sentiment_label", sentiment)
    if neighborhood:
        query = query.eq("inferred_neighborhood", neighborhood)
        
    if bounds:
        try:
            sw_lat, sw_lng, ne_lat, ne_lng = map(float, bounds.split(","))
            query = query.gte("lat", sw_lat).lte("lat", ne_lat)
            query = query.gte("lng", sw_lng).lte("lng", ne_lng)
        except Exception as e:
            print(f"[SocialRadar] ⚠️ Erro no parse de bounds ({bounds}): {e}")

    result = query.execute()
    return result.data or []


@router.get("/campaign/{campaign_id}/map/tactical", response_model=TacticalMapData)
async def get_tactical_map_data(campaign_id: str):
    """
    Dados consolidados para o Mapa Tático:
    - Votos Históricos (locations)
    - Sentimentos Recentes (social_mentions)
    Cruzamento por bairro/região.
    """
    supabase = get_supabase_client()

    # 0. Buscar alvos monitorados (Setup na tabela campaigns)
    monitored_targets = []
    try:
        result_campaign = supabase.table("campaigns") \
            .select("social_links") \
            .eq("id", campaign_id) \
            .execute()
        
        if result_campaign.data and len(result_campaign.data) > 0:
            social_links = result_campaign.data[0].get("social_links") or {}
            ig = social_links.get("instagram", [])
            tk = social_links.get("tiktok", [])
            monitored_targets = list(set(ig + tk))
    except Exception as e:
        print(f"[SocialRadar] ⚠️ social_links fallback: {e}")

    # 1. Buscar menções com coordenadas
    mentions = []
    try:
        mentions_res = supabase.table("social_mentions") \
            .select("*") \
            .eq("campaign_id", campaign_id) \
            .not_.is_("lat", "null") \
            .order("created_at", desc=True) \
            .limit(200) \
            .execute()

        # 1.5 Remapear author_username para author (Frontend compatibility)
        sentiment_map = {"Positivo": 5, "Neutro": 3, "Negativo": 1}
        for m in mentions_res.data or []:
            m["author"] = m.get("author_username", "anônimo")
            m["is_mock"] = False # O banco não guarda isso, mas o frontend espera um boolean
            m["sentiment"] = sentiment_map.get(m.get("sentiment_label", "Neutro"), 3)
        mentions = mentions_res.data or []
    except Exception as e:
        print(f"[SocialRadar] ⚠️ social_mentions fetch failed: {e}")

    # 2. Buscar locations (votos) para cruzamento
    locations = []
    try:
        locations_res = supabase.table("locations") \
            .select("id, name, lat, lng, votes_count, vote_goal") \
            .eq("campaign_id", campaign_id) \
            .execute()

        locations = locations_res.data or []
    except Exception as e:
        print(f"[SocialRadar] ⚠️ locations fetch failed: {e}")

    # 3. Criar resumo por bairro
    neighborhood_stats: dict = {}
    for m in mentions:
        nb = m.get("inferred_neighborhood", "Desconhecido")
        if nb not in neighborhood_stats:
            neighborhood_stats[nb] = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
        label = m.get("sentiment_label", "Neutro")
        if label == "Positivo":
            neighborhood_stats[nb]["positive"] += 1
        elif label == "Negativo":
            neighborhood_stats[nb]["negative"] += 1
        else:
            neighborhood_stats[nb]["neutral"] += 1
        neighborhood_stats[nb]["total"] += 1

    locations_summary = [
        {
            "neighborhood": nb,
            **stats
        }
        for nb, stats in neighborhood_stats.items()
    ]

    # 4. Breakdown global
    total = len(mentions)
    sentiment_breakdown = {
        "positive": sum(1 for m in mentions if m.get("sentiment_label") == "Positivo"),
        "negative": sum(1 for m in mentions if m.get("sentiment_label") == "Negativo"),
        "neutral": sum(1 for m in mentions if m.get("sentiment_label") == "Neutro"),
    }

    return TacticalMapData(
        mentions=mentions,
        locations_summary=locations_summary,
        total_mentions=total,
        sentiment_breakdown=sentiment_breakdown,
        monitored_targets=monitored_targets
    )


@router.post("/campaign/{campaign_id}/social/micro-strategy", response_model=MicroStrategyResponse)
async def generate_micro_strategy(campaign_id: str, request: MicroStrategyRequest):
    """
    Gera uma Micro-Estratégia Tática baseada nos dados do bairro.
    Cruza: votos do local + comentários do bairro → plano de ação via IA.
    """
    supabase = get_supabase_client()

    # 1. Buscar menções do bairro
    mentions_res = supabase.table("social_mentions") \
        .select("text, sentiment_label, author_username, rival_handle") \
        .eq("campaign_id", campaign_id) \
        .eq("inferred_neighborhood", request.neighborhood) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()

    mentions = mentions_res.data or []

    # 2. Buscar dados de votos do local (se fornecido)
    votes_context = "Sem dados de votação específicos para este local."
    if request.location_id:
        loc_res = supabase.table("locations") \
            .select("name, votes_count, vote_goal") \
            .eq("id", request.location_id) \
            .single() \
            .execute()

        if loc_res.data:
            loc = loc_res.data
            votes_context = f"Local: {loc['name']} — Votos: {loc.get('votes_count', 0)} | Meta: {loc.get('vote_goal', 0)}"

        # Buscar ranking do local
        results_res = supabase.table("location_results") \
            .select("candidate_name, votes") \
            .eq("location_id", request.location_id) \
            .order("votes", desc=True) \
            .limit(5) \
            .execute()

        if results_res.data:
            ranking = "\n".join([f"  - {r['candidate_name']}: {r['votes']} votos" for r in results_res.data])
            votes_context += f"\nRanking:\n{ranking}"

    # 3. Buscar info da campanha
    campaign_res = supabase.table("campaigns") \
        .select("candidate_name, city, role") \
        .eq("id", campaign_id) \
        .single() \
        .execute()

    campaign = campaign_res.data or {}

    # 4. Montar contexto para IA
    mentions_text = "\n".join([
        f"- [{m.get('sentiment_label', 'N/D')}] @{m.get('author_username', '?')}: \"{m['text']}\" (sobre {m.get('rival_handle', '?')})"
        for m in mentions
    ]) or "Sem menções recentes neste bairro."

    # 5. Chamada LLM usando a Biblioteca de Agentes (CrewAI)
    try:
        from src.crew.geosocial_crew import GeoSocialCrew
        
        crew = GeoSocialCrew(campaign_id=campaign_id)
        result_output = crew.generate_strategy(
            neighborhood=request.neighborhood,
            mentions_text=mentions_text,
            votes_context=votes_context
        )

        return {
            "success": True,
            "estrategia_tato": result_output.estrategia_tato,
            "diagnostico": result_output.diagnostico,
            "conteudo_sugerido": result_output.conteudo_sugerido,
            "tarefa_delega": result_output.tarefa_delega,
            "neighborhood": request.neighborhood,
            "data_points": len(mentions)
        }

    except Exception as e:
        print(f"[MicroStrategy] ❌ Erro: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar micro-estratégia: {str(e)}")


@router.post("/campaign/{campaign_id}/social/delegate-task")
async def delegate_social_task(campaign_id: str, request: DelegateTaskRequest):
    """
    Transforma uma micro-estratégia gerada em uma tarefa real no Kanban.
    """
    supabase = get_supabase_client()
    
    # 1. Montar o título e descrição
    title = f"📍 Estratégia: {request.tarefa_delega[:50]}..."
    description = f"""
## 🎯 Diagnóstico IA
{request.diagnostico}

## 🚀 Manobra Estratégica
{request.estrategia_tato}

## 🎬 Conteúdo Sugerido
{request.conteudo_sugerido}

## 📋 Ação Prática
{request.tarefa_delega}
    """.strip()

    try:
        # 2. Criar a Task
        task_data = {
            "campaign_id": campaign_id,
            "title": title,
            "description": description,
            "status": "pending",
            "priority": "high",
            "pillar": "Território & Presença",
            "phase": "Execução"
        }
        
        result = supabase.table("tasks").insert(task_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Erro ao criar tarefa")
            
        return {"success": True, "task_id": result.data[0]["id"]}
        
    except Exception as e:
        print(f"[DelegateSocial] ❌ Erro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign/{campaign_id}/social/stats")
async def get_social_stats(campaign_id: str):
    """Retorna estatísticas resumidas do radar social para badges/dashboards."""
    supabase = get_supabase_client()

    # Busca as menções sociais
    result_mentions = supabase.table("social_mentions") \
        .select("id, sentiment_label") \
        .eq("campaign_id", campaign_id) \
        .execute()

    mentions = result_mentions.data or []
    total = len(mentions)

    # Busca os handles cadastrados (monitored_targets) da campanha
    result_campaign = supabase.table("campaigns") \
        .select("social_links") \
        .eq("id", campaign_id) \
        .execute()
    
    monitored_targets = []
    if result_campaign.data and len(result_campaign.data) > 0:
        social_links = result_campaign.data[0].get("social_links") or {}
        ig = social_links.get("instagram", [])
        tk = social_links.get("tiktok", [])
        # Garante que seja uma lista única de handles formatados
        monitored_targets = list(set((ig if ig else []) + (tk if tk else [])))

    return {
        "total_mentions": total,
        "positive": sum(1 for m in mentions if m.get("sentiment_label") == "Positivo"),
        "negative": sum(1 for m in mentions if m.get("sentiment_label") == "Negativo"),
        "neutral": sum(1 for m in mentions if m.get("sentiment_label") == "Neutro"),
        "has_mock": False, # Temporariamente desativado até coluna is_mock existir
        "is_active": total > 0,
        "monitored_targets": monitored_targets
    }

import time
import httpx

@router.get("/campaign/{campaign_id}/social/stats/breakdown")
async def get_social_stats_breakdown(campaign_id: str):
    """
    Dashboard Enterprise: Retorna uma contagem exata de posts extraídos *por perfil* social monitorado.
    """
    supabase = get_supabase_client()

    # 1. Obter a lista oficial de alvos no Setup
    result_campaign = supabase.table("campaigns") \
        .select("social_links") \
        .eq("id", campaign_id) \
        .execute()
    
    monitored_targets = []
    if result_campaign.data and len(result_campaign.data) > 0:
        social_links = result_campaign.data[0].get("social_links") or {}
        ig = social_links.get("instagram", []) or []
        tk = social_links.get("tiktok", []) or []
        kw = social_links.get("keywords", []) or []
        ht = social_links.get("hashtags", []) or []
        monitored_targets = list(set(ig + tk + kw + ht))

    # 2. Obter todas as menções atreladas aos alvos ou gerais
    result_mentions = supabase.table("social_mentions") \
        .select("id, rival_handle, platform, created_at, author_username, lat, lng, inferred_neighborhood, sentiment_label") \
        .eq("campaign_id", campaign_id) \
        .execute()
    
    mentions = result_mentions.data or []

    # 3. Construir o de-para (Breakdown)
    breakdown = []
    
    for target in monitored_targets:
        # Se for um handle, procuramos no campo rival_handle
        # Se for hashtag ou palavra-chave (ainda a implementar rastreio avançado no back), fallback para 0
        is_handle = target.startswith('@')
        target_clean = target.strip('@ ').lower()
        
        def handle_match(m):
            if not is_handle or not m.get("rival_handle"):
                return False
            db_handle = m.get("rival_handle").strip('@ ').lower()
            return db_handle == target_clean
            
        target_mentions = [m for m in mentions if handle_match(m)]
        
        unique_authors = len(set([m.get("author_username") for m in target_mentions if m.get("author_username")]))
        locations_count = len([m for m in target_mentions if m.get("lat") or m.get("lng") or m.get("inferred_neighborhood")])
        sentiment_positive = len([m for m in target_mentions if m.get("sentiment_label") == "Positivo"])
        sentiment_negative = len([m for m in target_mentions if m.get("sentiment_label") == "Negativo"])
        sentiment_neutral = len([m for m in target_mentions if m.get("sentiment_label") == "Neutro"])
        
        breakdown.append({
            "target": target,
            "total_posts": len(target_mentions),
            "platforms": list(set([m.get("platform") for m in target_mentions if m.get("platform")])),
            "last_post": max([m.get("created_at") for m in target_mentions]) if target_mentions else None,
            "unique_authors": unique_authors,
            "locations_count": locations_count,
            "sentiment_stats": {
                "positive": sentiment_positive,
                "negative": sentiment_negative,
                "neutral": sentiment_neutral
            }
        })
        
    return { "breakdown": breakdown, "total_tracked_targets": len(monitored_targets) }


@router.get("/campaign/{campaign_id}/social/target/{handle}/details")
async def get_target_details(campaign_id: str, handle: str):
    """
    Visibilidade Completa por Perfil: Retorna posts, comentaristas e sentimento de um alvo específico.
    """
    supabase = get_supabase_client()
    
    # Normalizar handle
    handle_clean = handle.strip("@ ").lower()
    
    # Buscar todas as menções desse alvo
    result = supabase.table("social_mentions") \
        .select("id, author_username, text, post_url, platform, sentiment_label, created_at, likes_count, comment_id, inferred_neighborhood, lat, lng") \
        .eq("campaign_id", campaign_id) \
        .execute()
    
    all_mentions = result.data or []
    
    # Filtrar pelo handle
    target_mentions = []
    for m in all_mentions:
        rival = (m.get("rival_handle") or "").strip("@ ").lower()
        if rival == handle_clean:
            target_mentions.append(m)
    
    if not target_mentions:
        return {
            "handle": handle,
            "total_posts": 0,
            "posts": [],
            "commenters": [],
            "sentiment": {"positive": 0, "negative": 0, "neutral": 0},
            "message": "Nenhum dado encontrado. Clique 'Sincronizar Agora' para buscar."
        }
    
    # Agrupar por post_url (cada URL = 1 post)
    posts_map = {}
    for m in target_mentions:
        url = m.get("post_url") or "sem_url"
        if url not in posts_map:
            posts_map[url] = {
                "url": url,
                "platform": m.get("platform"),
                "comments_count": 0,
                "comments": [],
                "first_seen": m.get("created_at"),
            }
        posts_map[url]["comments_count"] += 1
        posts_map[url]["comments"].append({
            "author": m.get("author_username"),
            "text": m.get("text", "")[:200],
            "sentiment": m.get("sentiment_label"),
            "likes": m.get("likes_count", 0),
            "neighborhood": m.get("inferred_neighborhood"),
        })
    
    posts_list = sorted(posts_map.values(), key=lambda p: p["comments_count"], reverse=True)
    
    # Comentaristas únicos
    commenters_set = {}
    for m in target_mentions:
        author = m.get("author_username", "anônimo")
        if author not in commenters_set:
            commenters_set[author] = {"username": author, "comments_count": 0, "platforms": set()}
        commenters_set[author]["comments_count"] += 1
        commenters_set[author]["platforms"].add(m.get("platform", ""))
    
    commenters_list = sorted(
        [{"username": c["username"], "comments_count": c["comments_count"], "platforms": list(c["platforms"])} for c in commenters_set.values()],
        key=lambda c: c["comments_count"], reverse=True
    )
    
    # Sentimento
    sentiment = {
        "positive": len([m for m in target_mentions if m.get("sentiment_label") == "Positivo"]),
        "negative": len([m for m in target_mentions if m.get("sentiment_label") == "Negativo"]),
        "neutral": len([m for m in target_mentions if m.get("sentiment_label") == "Neutro"]),
    }
    
    return {
        "handle": handle,
        "total_mentions": len(target_mentions),
        "total_posts": len(posts_list),
        "total_commenters": len(commenters_list),
        "posts": posts_list[:20],  # Top 20 posts
        "commenters": commenters_list[:30],  # Top 30 commenters
        "sentiment": sentiment,
    }

@router.get("/admin/services/engine/test")
async def test_engine_connection():
    """
    Painel de Saúde Enterprise: Dispara um ping de teste simulando 
    a conexão com serviços externos de Data Scraping / Tavily / AIOS.
    """
    start_time = time.time()
    try:
        # PING leve no Tavily apenas para atestar DNS e API Key local
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not tavily_key:
            return {"status": "offline", "reason": "TAVILY_API_KEY missing", "latency_ms": 0}

        headers = {"Authorization": f"Bearer {tavily_key}", "Content-Type": "application/json"}
        payload = {"query": "test ping", "search_depth": "basic", "max_results": 1}
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post("https://api.tavily.com/search", headers=headers, json=payload)
            res.raise_for_status()

        latency_ms = int((time.time() - start_time) * 1000)
        return {"status": "online", "latency_ms": latency_ms, "service": "Tavily Search API"}

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        print(f"[Engine Test] ❌ {e}")
        return {"status": "offline", "reason": str(e), "latency_ms": latency_ms}
