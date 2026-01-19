import os
import json
from typing import List, Dict, Any, Optional
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from tavily import TavilyClient
from crewai.tools import BaseTool

load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment")
    return create_client(url, key)

# --- PYDANTIC MODELS FOR STRUCTURED OUTPUT ---
class MediaItem(BaseModel):
    date: str = Field(description="Date of the news/article in YYYY-MM-DD format (or 'Recent' if unknown)")
    source: str = Field(description="Name of the news source, newspaper, or website")
    title: str = Field(description="Headline or title of the article")
    sentiment: str = Field(description="Sentiment analysis of the content: 'positive', 'neutral', or 'negative'")
    url: str = Field(description="Direct URL to the source article")
    summary: str = Field(description="Brief summary of the content and how it relates to campaign promises")

class MediaScanResult(BaseModel):
    items: List[MediaItem] = Field(description="List of media items found during the scan")
    overview: str = Field(description="General overview or conclusion of the media landscape")

# --- CUSTOM TAVILY TOOL (CLASSIC APPROACH) ---
class TavilySearchTool(BaseTool):
    name: str = "Busca na Web (Tavily)"
    description: str = "Realiza buscas na internet para encontrar notícias e promessas políticas recentes."
    api_key: str = Field(..., description="API Key do Tavily")

    def _run(self, query: str) -> str:
        from tavily import TavilyClient
        client = TavilyClient(api_key=self.api_key)
        results = client.search(query, search_depth="advanced", max_results=5)
        return str(results)

class RadarCrew:
    """
    Radar Crew: Equipe de Agentes para o Radar de Promessas.
    Executa tarefas pontuais (extração, análise fiscal) usando Personas definidas no banco.
    """
    
    def __init__(self, campaign_id: str, run_id: str = None):
        self.campaign_id = campaign_id
        self.run_id = run_id
        self.supabase = get_supabase_client()
        self.llm = self._create_llm("deepseek/deepseek-chat") # Default, can be overridden by persona config
    
        # GLOBAL DEEPSEEK ALIGNMENT
        self.log(f"Inicializando RadarCrew LLM: {self.llm.model_name}", "System")

    def _create_llm(self, model_name: str, temperature: float = 0.3):
        # 1. Default Handling
        if not model_name:
            model_name = "deepseek/deepseek-chat"
            
        # 2. Safeguard: Detect OpenAI and Force DeepSeek
        if "gpt-4" in model_name or "gpt-3.5" in model_name:
            print(f"[DEBUG] ⚠️ RadarCrew detected OpenAI model '{model_name}'. Forcing DeepSeek override.")
            model_name = "deepseek/deepseek-chat"

        # 3. Provider Specifics
        api_key = None
        base_url = None
        
        if "deepseek" in model_name:
            api_key = os.getenv("DEEPSEEK_API_KEY")
            base_url = "https://api.deepseek.com/v1"
            if not model_name.startswith("deepseek/"):
                 model_name = f"deepseek/{model_name}" if "/" not in model_name else model_name
            
            clean_model = model_name.replace("deepseek/", "")
            
            # Audit
            print(f"[System] LLM_AUDIT create provider=deepseek base_url={base_url} model={clean_model} source=radar_crew.py")
            
            return ChatOpenAI(
                model=clean_model,
                api_key=api_key,
                base_url=base_url,
                temperature=temperature
            )

        # Legacy / Other providers
        if model_name.startswith("openrouter/"):
            os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY")
        elif model_name.startswith("groq/"):
            os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
            
        return ChatOpenAI(model=model_name, temperature=temperature)

    def _log_step(self, step_output: Any):
        """Callback para logar pensamentos dos agentes"""
        try:
            val = ""
            if hasattr(step_output, 'thought') and step_output.thought:
                val = f"💭 {step_output.thought[:300]}..."
                self.log(val, "AI Brain", "info")
            if hasattr(step_output, 'tool') and step_output.tool:
                val = f"🛠️ Tool: {step_output.tool}"
                self.log(val, "Tool", "warning")
            if hasattr(step_output, 'result') and step_output.result:
                val = f"✅ Result: {str(step_output.result)[:200]}..."
                self.log(val, "Tool", "success")
        except Exception as e:
            print(f"Log error: {e}")

    def log(self, message: str, agent_name: str = "System", status: str = "info"):
        """Salva logs no Supabase"""
        if self.run_id:
            try:
                self.supabase.table("agent_logs").insert({
                    "run_id": self.run_id,
                    "campaign_id": self.campaign_id,
                    "agent_name": agent_name,
                    "message": message,
                    "status": status
                }).execute()
            except Exception as e:
                print(f"Error saving log: {e}")
        else:
            print(f"[{agent_name}] {message}")

    def _get_agent_config(self, agent_name: str):
        """Busca configuração do agente na tabela 'agents'"""
        resp = self.supabase.table("agents").select("*").eq("name", agent_name).single().execute()
        if not resp.data:
            return self._get_persona_config_legacy(agent_name)
        return resp.data

    def _get_persona_config_legacy(self, persona_name: str):
        try:
            resp = self.supabase.table("personas").select("*").eq("name", persona_name).single().execute()
            if resp.data:
                p = resp.data
                config = p.get("config", {})
                return {
                    "role": config.get("role", "Agente"),
                    "system_prompt": config.get("system_message", ""),
                    "llm_model": p.get("llm_model")
                }
        except:
            pass
        raise ValueError(f"Agente '{persona_name}' não encontrado.")

    # --- FASE 1: EXTRAÇÃO ---
    def run_extraction(self, document_text: str) -> Dict:
        agent_name = "radar-extrator-promessas"
        agent_data = self._get_agent_config(agent_name)
        
        agent = Agent(
            role=agent_data.get("role", "Extractor"),
            goal="Extrair promessas de documentos",
            backstory="Especialista em análise textual política.",
            llm=self._create_llm(agent_data.get("llm_model"), 0.3),
            max_iter=10,
            verbose=True,
            allow_delegation=False
        )

        sys_msg = agent_data.get("system_prompt", "")
        
        task = Task(
            description=f"""
            {sys_msg}
            ANALYZE THE FOLLOWING TEXT AND EXTRACT PROMISES FROM THE GOVERNMENT PLAN.
            IF THE TEXT IS EMPTY, RETURN [].
            OUTPUT FORMAT MUST BE A VALID JSON ARRAY.
            
            DOCUMENT TEXT:
            {document_text[:50000]} 
            """,
            agent=agent,
            expected_output="JSON array with extracted promises keys: resumo_promessa, categoria, verbos_chave, entidades_citadas, local, origem, trecho_original"
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            verbose=True,
            step_callback=self._log_step
        )
        
        self.log(f"Iniciando extração com {agent_name}", "System")
        result = crew.kickoff()
        
        # Simple manual parse for Phase 1 (staying robust but simple)
        raw = str(result)
        if "```json" in raw: raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw: raw = raw.split("```")[1].split("```")[0]
             
        try:
            return json.loads(raw.strip())
        except json.JSONDecodeError:
            self.log("Erro ao parsear JSON da IA", "System", "error")
            return {"raw_output": raw, "error": "json_parse_error"}

    # --- FASE 2: ANÁLISE FISCAL ---
    def run_fiscal_analysis(self, promises_summary: List[Dict], expenses_summary: Dict) -> Dict:
        agent_name = "radar-fiscal-verbas"
        agent_data = self._get_agent_config(agent_name)
        
        agent = Agent(
            role=agent_data.get("role", "Auditor"),
            goal="Cruzar promessas com execução orçamentária",
            backstory="Auditor rigoroso de contas públicas.",
            llm=self._create_llm(agent_data.get("llm_model"), 0.3),
            max_iter=10,
            verbose=True,
            allow_delegation=False
        )

        sys_msg = agent_data.get("system_prompt", "")
        input_data = {"promessas": promises_summary, "despesas_agrupadas": expenses_summary}
        input_json = json.dumps(input_data, ensure_ascii=False, indent=2)

        task = Task(
            description=f"{sys_msg}\nINPUT DATA (JSON):\n{input_json}",
            agent=agent,
            expected_output="JSON with fiscal analysis and semaphore evaluation"
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            verbose=True,
            step_callback=self._log_step
        )
        
        self.log(f"Iniciando análise fiscal com {agent_name}", "System")
        result = crew.kickoff()
        
        raw = str(result)
        if "```json" in raw: raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw: raw = raw.split("```")[1].split("```")[0]
             
        try:
            return json.loads(raw.strip())
        except json.JSONDecodeError:
            self.log("Erro ao parsear JSON da IA (Fiscal)", "System", "error")
            return {"raw_output": raw, "error": "json_parse_error"}

    # --- FASE 3: VARREDURA (REFATURADA COM TAVILY E PYDANTIC) ---
    def run_google_scan(self, politician_name: str, city_name: str, agent_name: str = "radar-google-scanner", target_sites: List[str] = [], search_mode: str = "hybrid", max_results: int = 10) -> Dict:
        """
        Fase 3: Executa o agente 'Radar - Investigador Google' usando Tavily Search Tool.
        """
        agent_data = self._get_agent_config(agent_name)
        
        # 1. Instantiate Custom Tool (Class Based)
        tavily_tool = TavilySearchTool(api_key=os.getenv("TAVILY_API_KEY"))
        
        # 2. Setup Agent
        agent = Agent(
            role=agent_data.get("role", "Investigador"),
            goal=agent_data.get("goal", "Identificar promessas e notícias em tempo real"),
            backstory=agent_data.get("description", "Especialista em OSINT e checagem de fatos."),
            llm=self._create_llm(agent_data.get("llm_model"), 0.5), # Higher temp for search synthesis
            tools=[tavily_tool],
            max_iter=15, # Allow more steps for search
            verbose=True,
            allow_delegation=False
        )

        sys_msg = agent_data.get("system_prompt", "")
        
        # 3. Build Directives
        search_context = f"Alvo: {politician_name} ({city_name})"
        if target_sites:
            sites_str = ", ".join(target_sites)
            if search_mode == "focused":
                search_context += f"\nMODO: FOCADO. Busque APENAS em: {sites_str}"
            else:
                search_context += f"\nMODO: HÍBRIDO. Priorize: {sites_str}, mas busque outras fontes relevantes."
        else:
             search_context += f"\nMODO: ABERTO. Busque em toda a internet."

        # 4. Setup Task with OUTPUT PYDANTIC
        task = Task(
            description=f"""
            {sys_msg}
            
            CONTEXTO DA INVESTIGAÇÃO:
            {search_context}
            
            SEUS OBJETIVOS:
            1. Use a tool 'Internet Search' para encontrar notícias e planos de governo recentes sobre {politician_name}.
            2. Procure por promessas de campanha, projetos de lei ou polêmicas recentes.
            3. Analise o sentimento de cada notícia encontrada.
            4. Compile os {max_results} resultados mais relevantes.
            
            IMPORTANTE:
            - Garanta que as URLs sejam válidas.
            - Resuma o conteúdo focado em PROPOSTAS ou AÇÕES POLÍTICAS.
            """,
            agent=agent,
            output_pydantic=MediaScanResult, # FORCE STRUCTURED OUTPUT
            expected_output="A structured list of media items found during the scan."
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            verbose=True,
            step_callback=self._log_step
        )
        
        self.log(f"Iniciando Varredura Real (Tavily) com Pydantic para {politician_name}", "System")
        
        try:
            result = crew.kickoff() # This returns a MediaScanResult object directly
            
            # Access pydantic fields directly from result if it's the object, 
            # Or accessing the pydantic attribute depending on CrewAI version output.
            # In recent CrewAI, result.pydantic or direct access if casted.
            
            # Safe access logic handling potential wrapper types
            items = []
            if hasattr(result, 'items'):
                items = result.items
            elif hasattr(result, 'pydantic') and result.pydantic:
                items = result.pydantic.items
            elif isinstance(result, dict) and 'items' in result:
                items = result['items']
            # Fallback if result is just correct structure
            elif hasattr(result, 'dict'):
                 items = result.dict().get('items', [])
            
            # Convert to dict list for JSON serialization
            serialized_items = [item.dict() if hasattr(item, 'dict') else item for item in items]

            return {
                "status": "ok",
                "message": "Varredura Tavily concluída",
                "media_sources": list(set([item.get('source', 'Unknown') for item in serialized_items])),
                "items_found": len(serialized_items),
                "details": serialized_items
            }

        except Exception as e:
            self.log(f"Erro crítico na execução do Crew (Tavily/Pydantic): {e}", "System", "error")
            return {
                "status": "error",
                "message": f"Falha na varredura: {str(e)}",
                "details": []
            }
