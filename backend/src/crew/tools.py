"""
PRISMA 888 - CrewAI Tools
=========================
Ferramentas de busca vetorial e estatísticas para os agentes de IA.

Autor: Prisma 888 Team
Última atualização: 2024-12-09
"""

import os
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client, Client
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Optional


def get_supabase_client() -> Client:
    """Retorna cliente Supabase autenticado."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment variables")
    return create_client(url, key)


def get_embeddings_model() -> OpenAIEmbeddings:
    """Retorna modelo de embeddings OpenAI (mesmo usado na ingestão)."""
    return OpenAIEmbeddings(model="text-embedding-3-small")


# ============================================================
# FERRAMENTA 1: BUSCA VETORIAL NO PLANO DE GOVERNO (PDF)
# ============================================================

class VectorSearchInput(BaseModel):
    """Schema de input para busca vetorial"""
    query: str = Field(
        ..., 
        description="Termo ou frase para buscar no documento. Exemplo: 'educação', 'saúde pública', 'segurança'"
    )
    author: str = Field(
        default="me",
        description="Autor do documento: 'me' para nossa campanha, ou nome do rival. Ex: 'me', 'João Silva'"
    )


class CampaignVectorSearchTool(BaseTool):
    name: str = "Campaign Vector Search"
    description: str = """
    Busca semântica no Plano de Governo (PDF) usando vetores.
    Use esta ferramenta para encontrar informações específicas sobre propostas,
    temas, ou qualquer conteúdo do documento de campanha.
    
    Parâmetros:
    - query: O termo de busca (ex: "educação", "saúde")
    - author: De quem é o documento? Use "me" para nosso plano, ou nome do rival.
    
    Exemplo buscar NOSSO plano: {"query": "educação", "author": "me"}
    Exemplo buscar plano do RIVAL: {"query": "educação", "author": "Carlos Rival"}
    """
    args_schema: type[BaseModel] = VectorSearchInput
    
    def _run(self, query: str, author: str = "me") -> str:
        """Executa busca vetorial usando LangChain SupabaseVectorStore."""
        campaign_id = os.getenv("CURRENT_CAMPAIGN_ID", "")
        
        if not campaign_id:
            return "Erro: CURRENT_CAMPAIGN_ID não definido no ambiente."
        
        try:
            # 1. Configurar Supabase e Embeddings
            supabase = get_supabase_client()
            embeddings = get_embeddings_model()
            
            # 2. Inicializar Vector Store apontando para a tabela CORRETA
            vector_store = SupabaseVectorStore(
                client=supabase,
                embedding=embeddings,
                table_name="document_chunks",      # ✅ Tabela correta
                query_name="match_documents"       # ✅ Função RPC para busca
            )
            
            # 3. Construir filtro com campaign_id E author_name
            search_filter = {"campaign_id": campaign_id}
            if author and author != "all":
                search_filter["author_name"] = author
            
            # 4. Realizar busca vetorial com filtro
            results = vector_store.similarity_search(
                query=query,
                k=5,
                filter=search_filter
            )
            
            # 5. Formatar retorno
            if not results:
                # Fallback: tentar busca direta sem filtro de metadata
                print(f"[VectorSearch] Busca com filtro retornou vazio, tentando fallback...")
                results = self._fallback_search(supabase, campaign_id, author)
                
                if not results:
                    author_label = "sua campanha" if author == "me" else f"rival '{author}'"
                    return f"Nenhum documento relevante encontrado para {author_label}."
            
            # Concatenar conteúdo dos chunks encontrados
            formatted_results = []
            author_label = "📄 Seu Plano" if author == "me" else f"🎭 Plano de {author}"
            for i, doc in enumerate(results, 1):
                content = doc.page_content if hasattr(doc, 'page_content') else doc.get('content', str(doc))
                formatted_results.append(f"[{author_label} - Trecho {i}]\n{content}")
            
            return "\n\n---\n\n".join(formatted_results)
            
        except Exception as e:
            print(f"[VectorSearch] Erro: {str(e)}")
            # Tentar fallback em caso de erro
            try:
                return self._fallback_search_simple(campaign_id, author)
            except Exception as fallback_error:
                return f"Erro ao buscar documentos: {str(e)} | Fallback também falhou: {str(fallback_error)}"
    
    def _fallback_search(self, supabase: Client, campaign_id: str, author: str = "me") -> list:
        """Fallback: busca direta na tabela document_chunks."""
        try:
            query = supabase.table("document_chunks") \
                .select("content, metadata") \
                .eq("campaign_id", campaign_id)
            
            # Adicionar filtro de autor se especificado
            if author and author != "all":
                query = query.eq("author_name", author)
            
            result = query.limit(5).execute()
            
            if result.data:
                # Criar objetos mock com page_content
                from types import SimpleNamespace
                return [SimpleNamespace(page_content=doc["content"]) for doc in result.data]
            return []
        except Exception as e:
            print(f"[Fallback] Erro: {e}")
            return []
    
    def _fallback_search_simple(self, campaign_id: str, author: str = "me") -> str:
        """Fallback simples: consulta direta sem vector store."""
        supabase = get_supabase_client()
        
        query = supabase.table("document_chunks") \
            .select("content") \
            .eq("campaign_id", campaign_id)
        
        if author and author != "all":
            query = query.eq("author_name", author)
        
        docs = query.limit(10).execute()
        
        if docs.data:
            return "\n\n---\n\n".join([doc["content"] for doc in docs.data])
        else:
            return "Nenhum documento encontrado para esta campanha."


# ============================================================
# FERRAMENTA 2: ESTATÍSTICAS DA CAMPANHA (CSV/LOCAIS)
# ============================================================

class CampaignStatsTool(BaseTool):
    name: str = "Campaign Statistics"
    description: str = """
    Retorna estatísticas e dados sobre os locais de votação da campanha.
    Use esta ferramenta para entender o cenário eleitoral, força em regiões,
    e dados quantitativos da campanha.
    """
    
    def _run(self) -> str:
        """Busca estatísticas dos locais de votação."""
        campaign_id = os.getenv("CURRENT_CAMPAIGN_ID", "")
        
        if not campaign_id:
            return "Erro: CURRENT_CAMPAIGN_ID não definido no ambiente."
        
        try:
            supabase = get_supabase_client()
            
            # Busca todos os locais da campanha
            locations = supabase.table("locations") \
                .select("*") \
                .eq("campaign_id", campaign_id) \
                .execute()
            
            if not locations.data:
                return "Nenhum dado de local encontrado para esta campanha."
            
            # Calcula estatísticas
            total_locations = len(locations.data)
            total_votes = sum(loc.get("votes_count", 0) or 0 for loc in locations.data)
            total_goal = sum(loc.get("vote_goal", 0) or 0 for loc in locations.data)
            
            avg_votes = total_votes / total_locations if total_locations > 0 else 0
            goal_percentage = (total_votes / total_goal * 100) if total_goal > 0 else 0
            
            # Identifica top 5 locais
            top_locations = sorted(
                locations.data,
                key=lambda x: x.get("votes_count", 0) or 0,
                reverse=True
            )[:5]
            
            # Identifica 5 locais com mais potencial (maior gap entre meta e votos)
            potential_locations = sorted(
                locations.data,
                key=lambda x: (x.get("vote_goal", 0) or 0) - (x.get("votes_count", 0) or 0),
                reverse=True
            )[:5]
            
            # Formata o resultado
            stats = f"""
📊 ESTATÍSTICAS DA CAMPANHA
{'='*40}

📍 Total de Locais Mapeados: {total_locations}
🗳️  Total de Votos: {total_votes:,}
🎯 Meta Total: {total_goal:,}
📈 Progresso: {goal_percentage:.1f}%
📉 Média de Votos por Local: {avg_votes:.0f}

🏆 TOP 5 LOCAIS (por votos):
"""
            for i, loc in enumerate(top_locations, 1):
                name = loc.get('name', 'Local sem nome')
                votes = loc.get('votes_count', 0) or 0
                stats += f"\n   {i}. {name}: {votes:,} votos"
            
            stats += f"\n\n🚀 TOP 5 LOCAIS COM MAIOR POTENCIAL (gap meta-votos):"
            for i, loc in enumerate(potential_locations, 1):
                name = loc.get('name', 'Local sem nome')
                goal = loc.get('vote_goal', 0) or 0
                votes = loc.get('votes_count', 0) or 0
                gap = goal - votes
                stats += f"\n   {i}. {name}: potencial de +{gap:,} votos"
            
            return stats
            
        except Exception as e:
            return f"Erro ao buscar estatísticas: {str(e)}"


# ============================================================
# FERRAMENTA 3: ANÁLISE DE COMPETIÇÃO POR LOCAL (TÁTICO)
# ============================================================

class LocationCompetitorInput(BaseModel):
    """Schema de input para análise de competição local"""
    location_id: str = Field(
        ..., 
        description="ID do local de votação para analisar a competição"
    )


class LocationCompetitorAnalysisTool(BaseTool):
    name: str = "Location Competitor Analysis"
    description: str = """
    Analisa a competição eleitoral em um local específico de votação.
    Retorna o ranking de candidatos, quem é o vencedor local 
    e a distância em votos para ultrapassá-lo.
    
    Use esta ferramenta para micro-targeting: entender onde atacar
    e quem são os principais adversários em cada região.
    
    Exemplo: {"location_id": "uuid-do-local"}
    """
    args_schema: type[BaseModel] = LocationCompetitorInput
    
    def _run(self, location_id: str) -> str:
        """Analisa competição em um local específico."""
        campaign_id = os.getenv("CURRENT_CAMPAIGN_ID", "")
        
        if not campaign_id:
            return "Erro: CURRENT_CAMPAIGN_ID não definido no ambiente."
        
        try:
            supabase = get_supabase_client()
            
            # 1. Buscar informações do local
            location = supabase.table("locations") \
                .select("id, name, votes_count, vote_goal") \
                .eq("id", location_id) \
                .single() \
                .execute()
            
            if not location.data:
                return f"Local não encontrado: {location_id}"
            
            location_name = location.data.get("name", "Local sem nome")
            our_votes = location.data.get("votes_count", 0) or 0
            
            # 2. Buscar resultados de todos candidatos neste local
            # Tabela location_results: location_id, candidate_name, candidate_party, votes
            results = supabase.table("location_results") \
                .select("candidate_name, candidate_party, votes") \
                .eq("location_id", location_id) \
                .order("votes", desc=True) \
                .execute()
            
            if not results.data:
                return f"Sem dados de competição para o local: {location_name}"
            
            # 3. Identificar nossa campanha (pelo campaign_id)
            campaign = supabase.table("campaigns") \
                .select("candidate_name") \
                .eq("id", campaign_id) \
                .single() \
                .execute()
            
            our_candidate = campaign.data.get("candidate_name", "Nosso Candidato") if campaign.data else "Nosso Candidato"
            
            # 4. Calcular ranking e posição
            candidates = results.data
            total_votes = sum(c.get("votes", 0) or 0 for c in candidates)
            
            # Encontrar nossa posição
            our_position = None
            our_result_votes = 0
            for i, c in enumerate(candidates, 1):
                if c.get("candidate_name", "").lower() == our_candidate.lower():
                    our_position = i
                    our_result_votes = c.get("votes", 0) or 0
                    break
            
            # Se não encontrou, usar votos da tabela locations
            if our_position is None:
                our_result_votes = our_votes
                # Estimar posição baseado nos votos
                our_position = len([c for c in candidates if (c.get("votes", 0) or 0) > our_votes]) + 1
            
            # Vencedor
            winner = candidates[0] if candidates else None
            winner_name = winner.get("candidate_name", "N/A") if winner else "N/A"
            winner_party = winner.get("candidate_party", "") if winner else ""
            winner_votes = winner.get("votes", 0) if winner else 0
            
            # Distância para o vencedor
            distance = winner_votes - our_result_votes
            
            # 5. Formatar resposta
            report = f"""
🎯 ANÁLISE DE COMPETIÇÃO: {location_name}
{'='*50}

📊 RANKING DE CANDIDATOS:
"""
            for i, c in enumerate(candidates[:5], 1):
                name = c.get("candidate_name", "N/A")
                party = c.get("candidate_party", "")
                votes = c.get("votes", 0) or 0
                pct = (votes / total_votes * 100) if total_votes > 0 else 0
                medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
                
                if name.lower() == our_candidate.lower():
                    report += f"\n   {medal} {name} ({party}): {votes:,} votos ({pct:.1f}%) ← VOCÊ"
                else:
                    report += f"\n   {medal} {name} ({party}): {votes:,} votos ({pct:.1f}%)"
            
            report += f"""

📍 SUA POSIÇÃO: {our_position}º lugar com {our_result_votes:,} votos

🏆 VENCEDOR: {winner_name} ({winner_party}) com {winner_votes:,} votos
📏 DISTÂNCIA: {distance:,} votos atrás do líder
"""
            
            # 6. Recomendação tática
            if our_position == 1:
                report += f"\n✅ RECOMENDAÇÃO: Você lidera! Proteja esta base."
            elif distance <= 50:
                report += f"\n⚡ RECOMENDAÇÃO: Disputável! Apenas {distance} votos. Prioridade ALTA."
            elif distance <= 200:
                report += f"\n🔥 RECOMENDAÇÃO: Alcançável com esforço moderado. Foco em engajamento."
            else:
                report += f"\n⚠️ RECOMENDAÇÃO: Gap significativo. Considere investir em outros locais."
            
            return report
            
        except Exception as e:
            return f"Erro ao analisar competição: {str(e)}"


# ============================================================
# INSTÂNCIAS DAS FERRAMENTAS (para importação)
# ============================================================

# Ferramentas Estratégicas (Genesis Crew)
campaign_vector_search = CampaignVectorSearchTool()
campaign_stats = CampaignStatsTool()

# Ferramentas Táticas (Micro-Targeting)
location_competitor_analysis = LocationCompetitorAnalysisTool()


# ============================================================
# FUNÇÃO UTILITÁRIA PARA TESTE
# ============================================================

def test_vector_search(query: str = "educação", campaign_id: str = None):
    """Função para testar a busca vetorial manualmente."""
    if campaign_id:
        os.environ["CURRENT_CAMPAIGN_ID"] = campaign_id
    
    print(f"🔍 Testando busca vetorial...")
    print(f"   Query: {query}")
    print(f"   Campaign ID: {os.getenv('CURRENT_CAMPAIGN_ID', 'NÃO DEFINIDO')}")
    print("-" * 50)
    
    result = campaign_vector_search._run(query)
    print(result)
    return result


def test_competitor_analysis(location_id: str, campaign_id: str = None):
    """Função para testar a análise de competição."""
    if campaign_id:
        os.environ["CURRENT_CAMPAIGN_ID"] = campaign_id
    
    print(f"🎯 Testando análise de competição...")
    print(f"   Location ID: {location_id}")
    print("-" * 50)
    
    result = location_competitor_analysis._run(location_id)
    print(result)
    return result


if __name__ == "__main__":
    # Teste rápido
    import sys
    if len(sys.argv) > 1:
        test_vector_search(
            query=sys.argv[1],
            campaign_id=sys.argv[2] if len(sys.argv) > 2 else None
        )
