import os
from langchain_openai import OpenAIEmbeddings
from supabase import create_client
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


class VectorSearchInput(BaseModel):
    """Schema de input para busca vetorial"""
    query: str = Field(..., description="Termo ou frase para buscar no documento. Exemplo: 'educação', 'saúde pública', 'segurança'")


class CampaignVectorSearchTool(BaseTool):
    name: str = "Campaign Vector Search"
    description: str = """
    Busca semântica no Plano de Governo (PDF) usando vetores.
    Use esta ferramenta para encontrar informações específicas sobre propostas,
    temas, ou qualquer conteúdo do documento de campanha.
    
    IMPORTANTE: O argumento 'query' deve ser uma STRING simples, não um objeto.
    Exemplo correto: {"query": "educação"}
    Exemplo ERRADO: {"query": {"description": "educação", "type": "str"}}
    """
    args_schema: type[BaseModel] = VectorSearchInput
    
    def _run(self, query: str) -> str:
        campaign_id = os.getenv("CURRENT_CAMPAIGN_ID", "")
        
        try:
            supabase = get_supabase_client()
            
            # Buscar todos os documentos da campanha
            docs = supabase.table("documents") \
                .select("content_text") \
                .eq("campaign_id", campaign_id) \
                .eq("file_type", "pdf_chunk") \
                .limit(5) \
                .execute()
            
            if docs.data:
                return "\n\n---\n\n".join([doc["content_text"] for doc in docs.data])
            else:
                return "Nenhum documento encontrado para esta campanha."
        
        except Exception as e:
            return f"Erro ao buscar documentos: {str(e)}"


class CampaignStatsTool(BaseTool):
    name: str = "Campaign Statistics"
    description: str = """
    Retorna estatísticas e dados sobre os locais de votação da campanha.
    Use esta ferramenta para entender o cenário eleitoral, força em regiões,
    e dados quantitativos da campanha.
    """
    
    def _run(self) -> str:
        campaign_id = os.getenv("CURRENT_CAMPAIGN_ID", "")
        
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
            total_votes = sum(loc.get("votes_count", 0) for loc in locations.data)
            total_goal = sum(loc.get("vote_goal", 0) for loc in locations.data)
            
            avg_votes = total_votes / total_locations if total_locations > 0 else 0
            
            # Identifica top 5 locais
            top_locations = sorted(
                locations.data,
                key=lambda x: x.get("votes_count", 0),
                reverse=True
            )[:5]
            
            # Formata o resultado
            stats = f"""
ESTATÍSTICAS DA CAMPANHA
========================

Total de Locais Mapeados: {total_locations}
Total de Votos: {total_votes:,}
Meta Total: {total_goal:,}
Média de Votos por Local: {avg_votes:.0f}

TOP 5 LOCAIS (por votos):
"""
            
            for i, loc in enumerate(top_locations, 1):
                stats += f"\n{i}. {loc.get('name', 'Local sem nome')}: {loc.get('votes_count', 0):,} votos"
            
            return stats
        
        except Exception as e:
            return f"Erro ao buscar estatísticas: {str(e)}"


# Instâncias das ferramentas
campaign_vector_search = CampaignVectorSearchTool()
campaign_stats = CampaignStatsTool()


