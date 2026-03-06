"""
Social Tools - Monitor Tático Social (PRISMA888)
=================================================
Scraper Apify + Refinaria de Sentimento LLM + Mock Data Generator

Responsabilidades:
1. ApifyScraper: Captura comentários de Instagram via Apify
2. SentimentRefinery: Analisa sentimentos e infere bairros via DeepSeek
3. MockDataGenerator: Gera dados fictícios geolocalizados para demos
"""

import os
import json
import random
import httpx
from datetime import datetime, timezone
from typing import Optional
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


# =============================================================================
# 1. APIFY SCRAPER
# =============================================================================
class ApifyScraper:
    """Integração com Apify para capturar comentários do Instagram."""

    def __init__(self):
        self.api_token = os.getenv("APIFY_API_TOKEN")
        if not self.api_token:
            raise ValueError("APIFY_API_TOKEN não configurado")
        self.base_url = "https://api.apify.com/v2"

    async def _run_actor(self, actor_id: str, run_input: dict) -> list[dict]:
        """Helper genérico para rodar atores Apify e coletar resultados."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                f"{self.base_url}/acts/{actor_id.replace('/', '~')}/runs",
                params={"token": self.api_token},
                json=run_input
            )
            if res.status_code != 201:
                print(f"[Apify] ⚠️ Erro ao iniciar {actor_id}: {res.status_code}")
                return []
            
            run_data = res.json()
            run_id = run_data["data"]["id"]
            dataset_id = run_data["data"]["defaultDatasetId"]
            
            # Polling
            import asyncio
            for _ in range(30):
                await asyncio.sleep(10)
                status_res = await client.get(
                    f"{self.base_url}/actor-runs/{run_id}",
                    params={"token": self.api_token}
                )
                status = status_res.json()["data"]["status"]
                if status == "SUCCEEDED": break
                if status in ("FAILED", "ABORTED", "TIMED-OUT"): return []
            
            items_res = await client.get(
                f"{self.base_url}/datasets/{dataset_id}/items",
                params={"token": self.api_token, "format": "json"}
            )
            return items_res.json() if items_res.status_code == 200 else []

    async def scrape_instagram_comments(self, handles: list[str], max_posts: int = 5) -> list[dict]:
        """Scrape comentários de posts de perfis específicos — dados REAIS."""
        all_comments = []
        for handle in handles:
            clean_handle = handle.replace("@", "").strip()
            if not clean_handle: continue
            run_input = {
                "directUrls": [f"https://www.instagram.com/{clean_handle}/"],
                "resultsLimit": max_posts * 10
            }
            print(f"[Apify] 📸 Buscando IG @{clean_handle} (limit={max_posts * 10})")
            results = await self._run_actor("apify/instagram-comment-scraper", run_input)
            print(f"[Apify] 📸 Retornou {len(results)} itens de @{clean_handle}")
            for item in results:
                all_comments.append({
                    "author": item.get("ownerUsername", "anônimo"),
                    "text": item.get("text", ""),
                    "platform": "instagram",
                    "source_url": item.get("url", ""),
                    "rival_handle": f"@{clean_handle}",
                    "likes": item.get("likesCount", 0),
                    "comment_id": item.get("id", ""),
                    "timestamp": item.get("timestamp", ""),
                })
        return all_comments

    async def scrape_keywords(self, keywords: list[str], max_results: int = 20) -> list[dict]:
        """Scrape posts baseados em palavras-chave (Monitoramento de Temas)."""
        all_results = []
        for kw in keywords:
            if not kw: continue
            run_input = { "queries": [kw], "resultsLimit": max_results }
            results = await self._run_actor("apify/tiktok-scraper", run_input)
            for item in results:
                all_results.append({
                    "author": item.get("authorMeta", {}).get("name", "anônimo"),
                    "text": item.get("text", ""),
                    "platform": "tiktok",
                    "source_url": item.get("webVideoUrl", ""),
                    "rival_handle": f"keyword:{kw}",
                    "likes": item.get("diggCount", 0)
                })
        return all_results

    async def scrape_hashtags(self, hashtags: list[str], max_results: int = 20) -> list[dict]:
        """Scrape posts baseados em hashtags específicas."""
        all_results = []
        for tag in hashtags:
            clean_tag = tag.replace("#", "").strip()
            if not clean_tag: continue
            run_input = { "hashtags": [clean_tag], "resultsLimit": max_results }
            results = await self._run_actor("apify/instagram-hashtag-scraper", run_input)
            for item in results:
                all_results.append({
                    "author": item.get("ownerUsername", "anônimo"),
                    "text": item.get("caption", ""),
                    "platform": "instagram",
                    "source_url": item.get("url", ""),
                    "rival_handle": f"#{clean_tag}",
                    "likes": item.get("likesCount", 0)
                })
        return all_results

    async def scrape_tiktok_comments(self, handles: list[str], max_posts: int = 5) -> list[dict]:
        """Scrape comentários do TikTok usando apify/tiktok-scraper — dados REAIS."""
        all_comments = []
        for handle in handles:
            clean_handle = handle.replace("@", "").strip()
            if not clean_handle: continue
            
            try:
                run_input = {
                    "profiles": [clean_handle],
                    "resultsLimit": max_posts * 10,
                    "excludeReviews": True
                }
                print(f"[Apify] 🎵 Buscando TikTok @{clean_handle} (limit={max_posts * 10})")
                results = await self._run_actor("apify/tiktok-scraper", run_input)
                print(f"[Apify] 🎵 Retornou {len(results)} itens de TikTok @{clean_handle}")
                
                for item in results:
                    text = item.get("text") or item.get("commentText", "")
                    if text and len(text) > 5:
                        all_comments.append({
                            "author": item.get("authorMeta", {}).get("name", "") or item.get("author", "anônimo"),
                            "text": text,
                            "platform": "tiktok",
                            "source_url": item.get("webVideoUrl", ""),
                            "rival_handle": f"@{clean_handle}",
                            "likes": item.get("diggCount", 0) or item.get("likesCount", 0),
                            "comment_id": item.get("id", ""),
                            "timestamp": item.get("createTime", ""),
                        })
            except Exception as e:
                print(f"[Apify] ❌ TikTok Error for @{clean_handle}: {e}")
        return all_comments


# =============================================================================
# 2. SENTIMENT REFINERY (LLM)
# =============================================================================
class SentimentRefinery:
    """Processa comentários com LLM para extrair sentimento e bairro."""

    def __init__(self):
        from langchain_openai import ChatOpenAI
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")

        print("[SentimentRefinery] 🧠 Inicializando LLM para análise de sentimento")
        self.llm = ChatOpenAI(
            model="deepseek/deepseek-chat",
            api_key=deepseek_key,
            base_url="https://api.deepseek.com/v1",
            temperature=0.3
        )

    def analyze_batch(self, comments: list[dict], city: str) -> list[dict]:
        """
        Analisa um batch de comentários e retorna com sentimento e bairro inferido.
        Processa em batch para eficiência.
        """
        from langchain.schema import SystemMessage, HumanMessage

        if not comments:
            return []

        # Processar em chunks de 10
        enriched = []
        chunk_size = 10

        for i in range(0, len(comments), chunk_size):
            chunk = comments[i:i + chunk_size]

            comments_text = "\n".join([
                f'{idx + 1}. "{c["text"]}" (por @{c.get("author", "anônimo")})'
                for idx, c in enumerate(chunk)
            ])

            prompt = f"""Analise estes comentários de redes sociais sobre políticos da cidade de {city}.
Para cada comentário, retorne um JSON array com:
- "index": número do comentário
- "sentiment": número de 1 a 5 (1=muito negativo, 3=neutro, 5=muito positivo)
- "sentiment_label": "Positivo", "Negativo" ou "Neutro"
- "inferred_neighborhood": bairro ou região mencionada/inferida no texto (ou "Centro" se não identificável)

Comentários:
{comments_text}

Responda APENAS com o JSON array, sem nenhum texto adicional."""

            try:
                response = self.llm.invoke([
                    SystemMessage(content="Você é um analista de sentimento político especialista em eleições brasileiras. Retorne apenas JSON válido."),
                    HumanMessage(content=prompt)
                ])

                content = response.content.strip()
                # Limpar possíveis markdown
                if content.startswith("```"):
                    content = content.split("\n", 1)[1]
                    content = content.rsplit("```", 1)[0]

                results = json.loads(content)

                for result in results:
                    idx = result.get("index", 0) - 1
                    if 0 <= idx < len(chunk):
                        chunk[idx]["sentiment"] = result.get("sentiment", 3)
                        chunk[idx]["sentiment_label"] = result.get("sentiment_label", "Neutro")
                        chunk[idx]["inferred_neighborhood"] = result.get("inferred_neighborhood", "Centro")

                enriched.extend(chunk)
                print(f"[SentimentRefinery] ✅ Batch {i // chunk_size + 1} processado ({len(chunk)} itens)")

            except Exception as e:
                print(f"[SentimentRefinery] ⚠️ Erro no batch: {e}")
                # Fallback: marcar como neutro
                for c in chunk:
                    c["sentiment"] = 3
                    c["sentiment_label"] = "Neutro"
                    c["inferred_neighborhood"] = "Centro"
                enriched.extend(chunk)

        return enriched


# =============================================================================
# 3. MOCK DATA GENERATOR (SEGURANÇA REUNIÃO)
# =============================================================================
class MockDataGenerator:
    """Gera dados fictícios geolocalizados para garantir mapa 'vivo' em demos."""

    # Templates de comentários por sentimento
    POSITIVE_TEMPLATES = [
        "O candidato {rival} tá fazendo um trabalho bom aqui no {bairro}, mas falta muito ainda",
        "Vi o {rival} na feira do {bairro}, pareceu gente boa, prometeu asfalto",
        "O pessoal do {rival} passou aqui no {bairro} distribuindo panfleto bonito",
        "Aqui no {bairro} o {rival} tem bastante voto, o povo gosta dele",
        "O comício do {rival} no {bairro} encheu demais, impressionante",
    ]

    NEGATIVE_TEMPLATES = [
        "Aqui no {bairro} tá um abandono total, cadê o {rival}? Só aparece em eleição!",
        "O {rival} prometeu asfaltar o {bairro} e até agora nada, só mentira",
        "Escola do {bairro} caindo aos pedaços e o {rival} gastando com outdoor",
        "No {bairro} o esgoto tá a céu aberto e o {rival} nem liga, vergonha!",
        "Posto de saúde do {bairro} sem médico, e o {rival} fazendo festa? Absurdo!",
    ]

    NEUTRAL_TEMPLATES = [
        "Alguém sabe se vai ter debate entre os candidatos aqui no {bairro}?",
        "Tão falando que o {rival} vai visitar o {bairro} semana que vem",
        "Vi propaganda do {rival} no poste aqui do {bairro}, normal né",
        "O pessoal do {bairro} tá dividido sobre o {rival}, tem prós e contras",
        "Reunião sobre saneamento no {bairro} com representantes do {rival}",
    ]

    # Bairros padrão por cidade (fallback genérico)
    DEFAULT_NEIGHBORHOODS = {
        "default": [
            {"name": "Centro", "lat_offset": 0.0, "lng_offset": 0.0},
            {"name": "Jardim América", "lat_offset": 0.008, "lng_offset": -0.005},
            {"name": "Vila Nova", "lat_offset": -0.006, "lng_offset": 0.010},
            {"name": "Parque Industrial", "lat_offset": 0.012, "lng_offset": 0.008},
            {"name": "Éden", "lat_offset": -0.015, "lng_offset": -0.003},
            {"name": "Jardim Europa", "lat_offset": 0.005, "lng_offset": -0.012},
            {"name": "Vila Barão", "lat_offset": -0.010, "lng_offset": 0.006},
            {"name": "Wanel Ville", "lat_offset": 0.018, "lng_offset": -0.008},
            {"name": "Cajuru", "lat_offset": -0.003, "lng_offset": 0.015},
            {"name": "Aparecidinha", "lat_offset": 0.009, "lng_offset": 0.012},
        ]
    }

    async def generate_mock_mentions(
        self,
        campaign_id: str,
        city: str,
        rival_handles: list[str],
        count: int = 12
    ) -> list[dict]:
        """
        Gera menções fictícias geolocalizadas nos bairros reais da cidade.
        """
        # 1. Buscar coordenadas da cidade via Nominatim
        city_lat, city_lng = -23.5489, -46.6388  # Fallback: São Paulo

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": f"{city}, Brasil", "format": "json", "limit": 1},
                    headers={"User-Agent": "PRISMA888/1.0"}
                )
                if res.status_code == 200:
                    data = res.json()
                    if data:
                        city_lat = float(data[0]["lat"])
                        city_lng = float(data[0]["lon"])
                        print(f"[MockGen] 📍 Coordenadas de {city}: {city_lat}, {city_lng}")
        except Exception as e:
            print(f"[MockGen] ⚠️ Fallback coords: {e}")

        # 2. Gerar bairros com coordenadas
        neighborhoods = self.DEFAULT_NEIGHBORHOODS.get(city.lower(), self.DEFAULT_NEIGHBORHOODS["default"])

        # 3. Gerar comentários
        mentions = []
        sentiment_distribution = [
            ("Negativo", self.NEGATIVE_TEMPLATES, (1, 2)),
            ("Neutro", self.NEUTRAL_TEMPLATES, (3, 3)),
            ("Positivo", self.POSITIVE_TEMPLATES, (4, 5)),
        ]

        for i in range(count):
            neighborhood = neighborhoods[i % len(neighborhoods)]
            label, templates, sent_range = random.choice(sentiment_distribution)
            template = random.choice(templates)
            rival = random.choice(rival_handles) if rival_handles else "candidato X"

            text = template.format(
                rival=rival.replace("@", ""),
                bairro=neighborhood["name"]
            )

            # Adicionar jitter nas coordenadas para não empilhar
            jitter_lat = random.uniform(-0.002, 0.002)
            jitter_lng = random.uniform(-0.002, 0.002)

            mentions.append({
                "campaign_id": campaign_id,
                "platform": random.choice(["instagram", "tiktok"]),
                "author_username": f"user_{random.randint(1000, 9999)}",
                "text": text,
                "sentiment_label": label,
                "inferred_neighborhood": neighborhood["name"],
                "lat": city_lat + neighborhood["lat_offset"] + jitter_lat,
                "lng": city_lng + neighborhood["lng_offset"] + jitter_lng,
                "post_url": "",
                "target_type": "rival",
                "rival_handle": rival
            })

        print(f"[MockGen] ✅ Gerados {len(mentions)} comentários mock para {city}")
        return mentions


# =============================================================================
# 4. ORCHESTRATOR (Pipeline completo)
# =============================================================================
class SocialRadarPipeline:
    """Orquestra todo o pipeline: Scrape → Refine → Persist (ou Mock fallback)."""

    def __init__(self):
        self.supabase = get_supabase_client()

    async def execute(self, campaign_id: str, max_posts: int = 10) -> dict:
        """
        Executa o pipeline completo para uma campanha.
        Retorna dict com status e contagem de menções.
        """
        # 1. Buscar dados da campanha
        campaign = self.supabase.table("campaigns") \
            .select("id, city, social_links") \
            .eq("id", campaign_id) \
            .single() \
            .execute()

        if not campaign.data:
            raise ValueError(f"Campanha {campaign_id} não encontrada")

        city = campaign.data.get("city", "São Paulo")
        
        # Novo QI 190: Buscar monitores por target_type (profile, keyword, hashtag)
        monitors = {"profile": [], "keyword": [], "hashtag": []}
        try:
            monitors_res = self.supabase.table("social_monitors") \
                .select("platform, target, target_type, is_active") \
                .eq("campaign_id", campaign_id) \
                .execute()
                
            db_monitors = monitors_res.data or []
            for m in db_monitors:
                if not m.get("is_active", True): continue
                t = m.get("target", "").strip()
                t_type = m.get("target_type", "profile")
                if not t: continue
                
                if t_type in monitors:
                    monitors[t_type].append(t)
        except Exception as e:
            print(f"[Pipeline] ⚠️ social_monitors skip: {e}")

        print(f"[Pipeline] 🎯 Campanha: {campaign_id} | Cidade: {city} | Limite: {max_posts}")
        
        # NOVO: Lei do Sync Incremental - Não apagamos mais o histórico!
        # Vamos buscar os IDs dos comentários já existentes para não duplicar.
        existing_ids = set()
        try:
            res_ids = self.supabase.table("social_mentions") \
                .select("comment_id") \
                .eq("campaign_id", campaign_id) \
                .neq("comment_id", "") \
                .execute()
            if res_ids.data:
                existing_ids = {row["comment_id"] for row in res_ids.data if row.get("comment_id")}
            print(f"[Pipeline] 🛡️ Sync Incremental Ativo: {len(existing_ids)} comentários já no banco.")
        except Exception as e:
            print(f"[Pipeline] ⚠️ Erro ao buscar IDs existentes: {e}")

        print(f"[Pipeline] 🔍 Alvos - Perfis: {len(monitors['profile'])} | Temas: {len(monitors['keyword'])} | Hashtags: {len(monitors['hashtag'])}")

        comments = []

        # 2. Tentar Scraping Real (QI 190 - Escuta Global)
        scraper = ApifyScraper()
        
        # Scrape de Perfis (Instagram e TikTok)
        if monitors["profile"]:
            try:
                # Filtrar handles por plataforma
                ig_profiles = [h for h in monitors["profile"] if h.startswith("@") or "instagram" in h]
                tk_profiles = [h for h in monitors["profile"] if "tiktok" in h or not h.startswith("@")] # Simplificação: se não tem @ e não é IG, tenta TK
                
                # Se for handle tático puro (ex: @webermanga), o scraper detecta pela plataforma no DB
                # Mas aqui enviamos para os métodos específicos
                if ig_profiles:
                    ig_comments = await scraper.scrape_instagram_comments(ig_profiles, max_posts=max_posts)
                    comments.extend(ig_comments)
                    print(f"[Pipeline] 📸 Apify retornou {len(ig_comments)} comentários de IG")

                if tk_profiles:
                    tk_comments = await scraper.scrape_tiktok_comments(tk_profiles, max_posts=max_posts)
                    comments.extend(tk_comments)
                    print(f"[Pipeline] 🎵 Apify retornou {len(tk_comments)} comentários de TikTok")

            except Exception as e:
                print(f"[Pipeline] ⚠️ Scrape de perfis falhou: {e}")

        # Scrape de Keywords (Temas)
        if monitors["keyword"]:
            try:
                kw_results = await scraper.scrape_keywords(monitors["keyword"], max_results=max_posts * 2)
                comments.extend(kw_results)
                print(f"[Pipeline] 🔍 Apify retornou {len(kw_results)} resultados por temas")
            except Exception as e:
                print(f"[Pipeline] ⚠️ Scrape de keywords falhou: {e}")

        # Scrape de Hashtags
        if monitors["hashtag"]:
            try:
                tag_results = await scraper.scrape_hashtags(monitors["hashtag"], max_results=max_posts * 2)
                comments.extend(tag_results)
                print(f"[Pipeline] 🏷️ Apify retornou {len(tag_results)} resultados por hashtags")
            except Exception as e:
                print(f"[Pipeline] ⚠️ Scrape de hashtags falhou: {e}")

        # 3. Sem dados reais → Retornar erro claro (Mock desativado)
        if not comments:
            print("[Pipeline] ⚠️ Nenhum dado real capturado. Mock Mode DESATIVADO.")
            return {
                "success": False,
                "mentions_count": 0,
                "source": "none",
                "city": city,
                "message": "⚠️ Nenhum dado real capturado."
            }

        # NOVO: Filtrar apenas comentários novos antes do Refinador LLM
        new_comments = []
        for c in comments:
            c_id = c.get("comment_id")
            if not c_id or c_id not in existing_ids:
                new_comments.append(c)

        if not new_comments:
            print("[Pipeline] 🛡️ Nenhum comentário novo encontrado. Economia de LLM ativada.")
            return {
                "success": True,
                "mentions_count": 0,
                "source": "incremental",
                "city": city,
                "message": f"🛡️ Sync Incremental: 0 novos / {len(existing_ids)} mantidos"
            }

        print(f"[Pipeline] 🧠 Enviando {len(new_comments)} NOVOS comentários para Refinaria LLM...")

        # 4. Refinar sentimento com LLM (apenas os novos)
        if new_comments:
            try:
                refinery = SentimentRefinery()
                enriched = refinery.analyze_batch(new_comments, city)
            except Exception as e:
                print(f"[Pipeline] ⚠️ Refinaria falhou: {e}")
                # Fallback: marcar como neutro
                for c in new_comments:
                    c["sentiment"] = 3
                    c["sentiment_label"] = "Neutro"
                    c["inferred_neighborhood"] = "Centro"
                enriched = comments

            # 5. Geocodificar bairros
            enriched = await self._geocode_neighborhoods(enriched, city)

            # 6. Persistir (com dados enriquecidos)
            records = [{
                "campaign_id": campaign_id,
                "platform": c.get("platform", "instagram"),
                "author_username": c.get("author", "anônimo"),
                "text": c["text"],
                "sentiment_label": c.get("sentiment_label", "Neutro"),
                "inferred_neighborhood": c.get("inferred_neighborhood", "Centro"),
                "lat": c.get("lat"),
                "lng": c.get("lng"),
                "post_url": c.get("source_url", ""),
                "target_type": "rival",
                "rival_handle": c.get("rival_handle", ""),
                "likes_count": c.get("likes", 0),
                "comment_id": c.get("comment_id", ""),
                "source": "apify"
            } for c in enriched]

            self._persist_mentions(records)

            return {
                "success": True,
                "mentions_count": len(records),
                "source": "apify",
                "city": city,
                "message": f"📡 {len(records)} menções capturadas e analisadas"
            }

        return {"success": False, "mentions_count": 0, "source": "none", "message": "Sem dados disponíveis"}

    async def _geocode_neighborhoods(self, comments: list[dict], city: str) -> list[dict]:
        """Geocodifica bairros mencionados nos comentários."""
        # Cache de bairros já geocodificados
        cache: dict[str, tuple[float, float]] = {}

        async with httpx.AsyncClient(timeout=10.0) as client:
            for comment in comments:
                neighborhood = comment.get("inferred_neighborhood", "Centro")
                if neighborhood in cache:
                    comment["lat"], comment["lng"] = cache[neighborhood]
                    continue

                try:
                    res = await client.get(
                        "https://nominatim.openstreetmap.org/search",
                        params={
                            "q": f"{neighborhood}, {city}, Brasil",
                            "format": "json",
                            "limit": 1
                        },
                        headers={"User-Agent": "PRISMA888/1.0"}
                    )
                    if res.status_code == 200:
                        data = res.json()
                        if data:
                            lat = float(data[0]["lat"]) + random.uniform(-0.002, 0.002)
                            lng = float(data[0]["lon"]) + random.uniform(-0.002, 0.002)
                            cache[neighborhood] = (lat, lng)
                            comment["lat"] = lat
                            comment["lng"] = lng
                            continue
                except Exception:
                    pass

                # Fallback se geocoding falhar
                comment["lat"] = None
                comment["lng"] = None

        return comments

    def _persist_mentions(self, records: list[dict]):
        """Persiste menções no Supabase."""
        if not records:
            return
            
        # Garante que não vamos inserir duplicatas se houver IDs iguais na mesma leva nova
        unique_records = []
        seen = set()
        for r in records:
            c_id = r.get("comment_id")
            if c_id and c_id in seen:
                continue
            if c_id:
                seen.add(c_id)
            unique_records.append(r)
            
        try:
            # Em lote de 500 para evitar payload grande demais
            batch_size = 500
            for i in range(0, len(unique_records), batch_size):
                batch = unique_records[i:i + batch_size]
                self.supabase.table("social_mentions").insert(batch).execute()
            print(f"[Pipeline] 💾 {len(unique_records)} NOVAS menções salvas no banco!")
        except Exception as e:
            print(f"[Pipeline] ❌ Erro ao salvar menções: {e}")
            raise
