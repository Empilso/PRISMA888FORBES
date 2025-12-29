from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from datetime import datetime
import os
from supabase import create_client

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

class TacticalAIService:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
        self.supabase = get_supabase_client()

    def generate_suggestion(self, campaign_id: str, location_id: int = None, note_content: str = None, lat: float = None, lng: float = None):
        """
        Generates a tactical action suggestion based on available context.
        Strategy: Micro-Targeting / Guerrilla.
        """
        
        # 1. Gather Context
        location_context = "Local: Não especificado (Ação Geral de Mapa)."
        address_context = ""
        rivals_context = "Sem dados de rivais para este ponto específico."
        tasks_context = "Sem histórico neste local."
        
        if location_id:
            # Fetch Location Data
            loc_res = self.supabase.table("locations").select("*").eq("id", location_id).single().execute()
            if loc_res.data:
                loc = loc_res.data
                location_context = f"Local: {loc.get('name')}"
                address_context = f"Endereço: {loc.get('address')}"

                # Fetch Rivals
                rivals_res = self.supabase.table("location_results") \
                    .select("candidate_name, votes") \
                    .eq("location_id", location_id) \
                    .order("votes", desc=True) \
                    .limit(3) \
                    .execute()
                if rivals_res.data:
                    rivals_context = "\n".join([f"- {r['candidate_name']}: {r['votes']} votos" for r in rivals_res.data])

                # Fetch Past Strategies
                tasks_res = self.supabase.table("strategies") \
                    .select("title") \
                    .eq("location_id", location_id) \
                    .execute()
                if tasks_res.data:
                     tasks_context = "\n".join([f"- {t['title']}" for t in tasks_res.data])
        
        # RAG Context (Campaign General)
        # Simplified: random or recent chunks
        docs_res = self.supabase.table("documents") \
            .select("content_text") \
            .eq("campaign_id", campaign_id) \
            .eq("file_type", "pdf_chunk") \
            .limit(3) \
            .execute()
        rag_context = "\n\n".join([d['content_text'][:500] + "..." for d in docs_res.data]) if docs_res.data else "Sem plano de governo disponível."

        note_specific_context = ""
        if note_content:
            note_specific_context = f"OBSERVAÇÃO TÁTICA DO CAMPO: \"{note_content}\". Use isso como base principal."

        # 2. Construct Prompt
        prompt = f"""
        Analise este cenário de batalha eleitoral:
        
        {location_context}
        {address_context}
        {f"Coordenadas: {lat}, {lng}" if lat and lng else ""}
        
        {note_specific_context}
        
        CENÁRIO RIVAL (Top Oponentes):
        {rivals_context}
        
        DIRETRIZES TÁTICAS (Plano de Governo):
        {rag_context}
        
        AÇÕES JÁ REALIZADAS:
        {tasks_context}
        
        MISSÃO:
        Sugira UMA (1) ação tática de alto impacto ("Micro-Targeting" / "Guerrilha") para virar votos ou consolidar esta área.
        A ação deve ser concreta, criativa e executável em curto prazo (48h).
        Se houver uma observação de campo, priorize resolver ou aproveitar o que foi relatado.
        
        FORMATO DE SAÍDA:
        Título: [Título Curto e Impactante]
        Descrição: [Descrição detalhada da ação em 1 parágrafo]
        """

        # 3. Call LLM
        response = self.llm.invoke([
            SystemMessage(content="Você é um estrategista político de guerrilha, especialista em micro-targeting e mobilização de rua."),
            HumanMessage(content=prompt)
        ])
        content = response.content

        # 4. Parse Response
        lines = content.split('\n')
        title = "Ação Sugerida"
        description = content
        
        for line in lines:
            if line.strip().lower().startswith("título:"):
                title = line.split(":", 1)[1].strip()
            if line.strip().lower().startswith("descrição:"):
                pass 
                
        # Cleanup description
        description = content.replace(f"Título: {title}", "").replace("Descrição:", "").strip()

        # 5. Persist Strategy
        strategy_data = {
            "campaign_id": campaign_id,
            "title": title,
            "description": description,
            "phase": "Reta Final",
            "pillar": "Micro-Targeting",
            "status": "suggested",
            "category": "Guerrilha"
        }
        
        if location_id:
            strategy_data["location_id"] = location_id
            
        insert_res = self.supabase.table("strategies").insert(strategy_data).execute()
        
        if not insert_res.data:
            raise Exception("Failed to save generated strategy")
            
        return insert_res.data[0]
