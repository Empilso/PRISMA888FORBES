import os
import json
from typing import List, Dict, Any, Optional
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

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
    
        # GLOBAL DEEPSEEK ALIGNMENT (Alignment with GenesisCrew)
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
            if not model_name.startswith("deepseek/"): # Fix prefix if needed
                 model_name = f"deepseek/{model_name}" if "/" not in model_name else model_name
            # clean for ChatOpenAI param
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
            if hasattr(step_output, 'thought') and step_output.thought:
                self.log(f"💭 {step_output.thought[:300]}...", "AI Brain", "info")
            if hasattr(step_output, 'tool') and step_output.tool:
                 self.log(f"🛠️ Tool: {step_output.tool}", "Tool", "warning")
            if hasattr(step_output, 'result') and step_output.result:
                 self.log(f"✅ Result: {str(step_output.result)[:200]}...", "Tool", "success")
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
            # Fallback to personas if not found (legacy support)
            return self._get_persona_config_legacy(agent_name)
        return resp.data

    def _get_persona_config_legacy(self, persona_name: str):
        """Fallback: Busca na tabela 'personas'"""
        try:
            resp = self.supabase.table("personas").select("*").eq("name", persona_name).single().execute()
            if resp.data:
                # Normalize to look like agent data
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

    def run_extraction(self, document_text: str) -> Dict:
        """
        Fase 1: Executa o agente 'Radar – Extrator de Promessas'
        """
        agent_name = "radar-extrator-promessas"
        agent_data = self._get_agent_config(agent_name)
        
        # Setup Agent
        # Uses default temperature 0.3 if not specified
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
        
        # Setup Task
        task = Task(
            description=f"""
            {sys_msg}
            
            ANALYZE THE FOLLOWING TEXT AND EXTRACT PROMISES FROM THE GOVERNMENT PLAN.
            
            IF THE TEXT IS EMPTY, TOO SHORT, OR DOES NOT CONTAIN A GOVERNMENT PLAN, RETURN AN EMPTY ARRAY [].

            OUTPUT FORMAT MUST BE A VALID JSON ARRAY OF OBJECTS.
            EACH OBJECT MUST HAVE EXACTLY THESE KEYS:
            - "resumo_promessa": A clear, concise summary of the promise (in Portuguese).
            - "categoria": One of [Saúde, Educação, Segurança, Infraestrutura, Meio Ambiente, Economia, Transporte, Social, Cultura, Esporte, Habitação].
            - "verbos_chave": List of key action verbs (e.g., ["construir", "criar"]).
            - "entidades_citadas": List of entities mentioned (e.g., ["SUS", "Prefeitura"]).
            - "local": The specific location/neighborhood mentioned, or null if none.
            - "origem": Must be "PLANO_GOVERNO".
            - "trecho_original": The exact text snippet from the document where this promise appears.

            Example:
            [
              {{
                "resumo_promessa": "Construir uma nova UPA na Zona Norte",
                "categoria": "Saúde",
                "verbos_chave": ["construir"],
                "entidades_citadas": ["UPA"],
                "local": "Zona Norte",
                "origem": "PLANO_GOVERNO",
                "trecho_original": "...vamos construir uma nova UPA para atender a Zona Norte..."
              }}
            ]

            DOCUMENT TEXT:
            {document_text[:50000]} 
            
            (Text truncated to fit context if necessary)
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
        
        # Parse output
        raw = str(result)
        # Cleanup markdown code blocks if present
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
             raw = raw.split("```")[1].split("```")[0]
             
        try:
            return json.loads(raw.strip())
        except json.JSONDecodeError:
            self.log("Erro ao parsear JSON da IA", "System", "error")
            return {"raw_output": raw, "error": "json_parse_error"}

    def run_fiscal_analysis(self, promises_summary: List[Dict], expenses_summary: Dict) -> Dict:
        """
        Fase 2: Executa o agente 'Radar – Fiscal de Verbas'
        """
        agent_name = "radar-fiscal-verbas"
        agent_data = self._get_agent_config(agent_name)
        
        # Setup Agent
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
        
        # Prepare Input Data
        input_data = {
            "promessas": promises_summary,
            "despesas_agrupadas": expenses_summary
        }
        input_json = json.dumps(input_data, ensure_ascii=False, indent=2)

        # Setup Task
        task = Task(
            description=f"""
            {sys_msg}
            
            INPUT DATA (JSON):
            
            {input_json}
            """,
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
        
        # Parse output
        raw = str(result)
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
             raw = raw.split("```")[1].split("```")[0]
             
        try:
            return json.loads(raw.strip())
        except json.JSONDecodeError:
            self.log("Erro ao parsear JSON da IA (Fiscal)", "System", "error")
            return {"raw_output": raw, "error": "json_parse_error"}
