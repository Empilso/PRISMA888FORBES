import os
import json
import uuid
import copy
from typing import List, Dict, Any, Sequence, Optional
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import httpx

# LiteLLM / CrewAI imports
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import PrivateAttr, ConfigDict

# Local Imports
from src.crew.tools import (
    campaign_vector_search, 
    campaign_stats, 
    location_competitor_analysis,
    competitor_vector_search, # NEW
    location_competitor_analysis,
    competitor_vector_search, # NEW
    municipal_spend_tool # NEW Phase 3 Audit Tool
)
from crewai_tools import PDFSearchTool, ScrapeWebsiteTool, FileReadTool # Knowledge Tools
# Note: Importing Schemas for Pydantic Output
from src.models.enterprise import AIExecutionLogSchema, StrategiesList, AdversarialReport

load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

# --- Robust LLM Client with Fallback ---

class LLMFallbackHandler:
    """
    Enterprise LLM Handler with Automatic Fallback.
    Priority: DeepSeek (Cost/Performance) -> Groq (Speed) -> OpenAI (Reliability)
    """
    def __init__(self, primary_provider="deepseek", temperature=0.7):
        self.primary_provider = primary_provider
        self.temperature = temperature
        self.log_prefix = "[LLM Handler] "

    def get_llm(self, model_hint: str = None) -> BaseChatModel:
        """Returns the best available LLM based on health and priority."""
        
        # 1. Try Primary (DeepSeek)
        if self.primary_provider == "deepseek":
            try:
                api_key = os.getenv("DEEPSEEK_API_KEY")
                if not api_key: raise ValueError("DeepSeek Key missing")
                
                # Check health (Optional simple ping)
                # For now, we return the client. If it fails during generation, we handle it there? 
                # CrewAI needs an instance. We will use a Custom Wrapper or just return ChatOpenAI with base_url
                # To support fallback DURING execution, we would need a custom 'Runnable' that catches errors.
                # For now, we configure the 'Best Effort' client.
                
                print(f"{self.log_prefix} Selected Primary: DeepSeek V3")
                return ChatOpenAI(
                    model="deepseek-chat", 
                    api_key=api_key, 
                    base_url="https://api.deepseek.com/v1", 
                    temperature=self.temperature
                )
            except Exception as e:
                print(f"{self.log_prefix} ⚠️ DeepSeek unavailable: {e}. Switching to Fallback.")
        
        # 2. Fallback: Groq (Llama 3 70B)
        try:
            api_key = os.getenv("GROQ_API_KEY")
            if api_key:
                print(f"{self.log_prefix} 🔄 Using Fallback: Groq (Llama 3)")
                return ChatOpenAI(
                    model="groq/llama-3.3-70b-versatile",
                    api_key=api_key,
                    base_url="https://api.groq.com/openai/v1",
                    temperature=self.temperature
                )
        except: pass
            
        # 3. Ultimate Fallback: OpenAI (GPT-4o)
        print(f"{self.log_prefix} 🛡️ Using Ultimate Fallback: OpenAI GPT-4o")
        return ChatOpenAI(model="gpt-4o", temperature=self.temperature)

class DeepSeekLLM(ChatOpenAI):
    """
    Official DeepSeek Adapter using LangChain Standard.
    Removes the old 'Trojan Horse' mock in favor of standard OpenAI-compatible client.
    """
    def __init__(self, api_key: str, model_name: str, temperature: float = 0.7, **kwargs):
        base_url = "https://api.deepseek.com/v1"
        clean_model = model_name.replace("deepseek/", "")
        if clean_model not in ["deepseek-chat", "deepseek-reasoner"]: 
            clean_model = "deepseek-chat"
            
        super().__init__(
            model=clean_model, 
            api_key=api_key, 
            base_url=base_url, 
            temperature=temperature, 
            **kwargs
        )

# --- Main Class: GenesisCrew with Enterprise Features ---

class GenesisCrew:
    """
    Genesis Crew Enterprise 2.0
    Features:
    - Inheritance Pattern (Agent Blueprint + Persona Instance) with Deepcopy
    - Dynamic Tool Loading from Registry
    - Structured Observability (ai_execution_logs)
    - Strict Pydantic Output
    - Enterprise Error Handling (Status Updates)
    """
    
    def __init__(self, campaign_id: str, persona: str = "standard", run_id: str = None, strategy_mode_override: str = None):
        self.campaign_id = campaign_id
        self.persona_name = persona
        self.run_id = run_id
        self.supabase = get_supabase_client()
        self.trace_id = str(uuid.uuid4())
        
        # --- ENTERPRISE INIT: Fetch Persona + Linked Agent Blueprint ---
        try:
            # 1. Fetch Persona Instance
            persona_res = self.supabase.table("personas").select("*").eq("name", persona).eq("is_active", True).execute()
            
            if not persona_res.data:
                # Fallback to any active
                self.log(f"Persona '{persona}' not found. Using fallback.", "System", "warning")
                persona_res = self.supabase.table("personas").select("*").eq("is_active", True).limit(1).execute()
                if not persona_res.data: raise ValueError("CRITICAL: No active personas found.")
            
            self.persona_data = persona_res.data[0]
            self.persona_name = self.persona_data.get("name")
            
            # 2. Extract Configuration
            self.config = self.persona_data.get("config", {}) or {}
            self.overrides = self.persona_data.get("overrides", {}) or {}
            self.linked_agent_id = self.persona_data.get("agent_id")
            
            # 3. Fetch Linked Blueprint (Inheritance Base)
            self.blueprint_agent = None
            if self.linked_agent_id:
                agent_res = self.supabase.table("agents").select("*").eq("id", self.linked_agent_id).single().execute()
                if agent_res.data:
                    self.blueprint_agent = agent_res.data
                    self.log(f"🧬 Inheritance Active: Linked to Blueprint '{self.blueprint_agent.get('role')}' (v{self.blueprint_agent.get('version')})", "System", "info")

            # 4. Execution Parameters
            self.task_count = self.config.get("task_count", 10)
            self.temperature = self.config.get("temperature", 0.7)
            self.max_iter = self.config.get("max_iter", 15)
            self.num_examples = self.config.get("num_examples", 2)
            self.tone = self.config.get("tone", "formal")
            self.process_type = self.config.get("process_type", "sequential")
            self.manager_model = self.config.get("manager_model", "gpt-4o")
            
            # 5. LLM Initialization
            llm_model = self.persona_data.get("llm_model") or "gpt-4o-mini"
            self.log(f"🧠 Engine: {llm_model} | Trace: {self.trace_id[:8]}", "System", "info")
            self.llm = self._create_llm(llm_model, self.temperature)
            
            # 6. Strategy Mode
            if strategy_mode_override:
                self.strategy_mode = strategy_mode_override
            else:
                camp_res = self.supabase.table("campaigns").select("strategy_mode").eq("id", campaign_id).single().execute()
                self.strategy_mode = camp_res.data.get("strategy_mode", "territory") if camp_res.data else "territory"
                
        except Exception as e:
            self.log(f"Init Failed: {e}", "System", "error")
            self._update_persona_status('error')
            raise e

    def _update_persona_status(self, status: str):
        """Atualiza o status da persona no banco de dados."""
        try:
            # Assumindo que podemos identificar a persona pelo ID se disponível, ou nome
            if hasattr(self, 'persona_data') and self.persona_data.get('id'):
                self.supabase.table("personas").update({"status": status}).eq("id", self.persona_data['id']).execute()
            else:
                self.supabase.table("personas").update({"status": status}).eq("name", self.persona_name).execute()
        except Exception as e:
            print(f"⚠️ Failed to update persona status: {e}")

    def log(self, message: str, agent_name: str = "System", status: str = "info", **kwargs):
        """Unified logging."""
        print(f"[{agent_name}] {message}")
        if self.run_id:
            try:
                # Legacy log
                self.supabase.table("agent_logs").insert({
                    "run_id": self.run_id, "campaign_id": self.campaign_id,
                    "agent_name": agent_name, "message": message, "status": status
                }).execute()
            except: pass

    def _get_llm_provider(self, metadata: Dict[str, Any]) -> Any:
        """
        DYNAMIC LLM PROVIDER FACTORY
        Parses metadata to instantiate the correct LLM.
        Expected Metadata: {"provider": "openai|deepseek|anthropic", "model": "...", "temperature": ...}
        Default: DeepSeek (Cost-Effective)
        """
        provider = metadata.get("provider", "deepseek").lower()
        model_name = metadata.get("model", "deepseek-chat")
        temperature = metadata.get("temperature", self.temperature)
        
        # Override for specific providers if needed
        api_key = None
        
        if provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            return ChatOpenAI(model=model_name, temperature=temperature, api_key=api_key)
            
        elif provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            try:
                from langchain_anthropic import ChatAnthropic
                return ChatAnthropic(model=model_name, temperature=temperature, api_key=api_key)
            except ImportError:
                # Fallback
                self.log("⚠️ langchain_anthropic not found. Falling back to DeepSeek.", "System", "warning")
                return self._create_llm("deepseek-chat", temperature)

        elif provider == "deepseek":
            api_key = os.getenv("DEEPSEEK_API_KEY")
            clean_model = model_name.replace("deepseek/", "")
            return DeepSeekLLM(api_key=api_key, model_name=clean_model, temperature=temperature)
            
        elif provider == "groq":
            os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
            return ChatOpenAI(model=f"groq/{model_name}", temperature=temperature)

        else:
            # Universal Fallback
            self.log(f"⚠️ Unknown provider '{provider}'. Defaulting to DeepSeek.", "System", "warning")
            return self._create_llm("deepseek-chat", temperature)

    def _create_llm(self, model_name: str, temperature: float = 0.7):
        """Legacy Factory / Helper for Fallbacks."""
        return self._get_llm_provider({"provider": "deepseek", "model": model_name, "temperature": temperature})

    def _get_tools_from_names(self, tool_names: List[str]) -> List[Any]:
        """
        DYNAMIC TOOL LOADER (Enterprise Registry)
        """
        tool_map = {
            "web_search": campaign_vector_search, # Fallback safe
            "tavily_search": campaign_vector_search, 
            "vector_search": campaign_vector_search,
            "campaign_data": campaign_stats,
            "db_query": campaign_stats,
            "statistics": campaign_stats,
            "competitor_analysis": location_competitor_analysis,
            "market_scan": location_competitor_analysis,
            "competitor_vector_search": competitor_vector_search, # NEW
            "municipal_expenses": municipal_spend_tool # NEW War Room
        }
        
        resolved_tools = []
        for name in tool_names:
            norm_name = name.lower().strip()
            if norm_name in tool_map:
                resolved_tools.append(tool_map[norm_name])
            else:
                self.log(f"⚠️ Tool '{name}' not found in registry. Using Safe Fallback.", "System", "warning")
        
        # Deduplicate by tool name (handling unhashable instances)
        seen_names = set()
        unique_tools = []
        for tool in resolved_tools:
            # Pydantic/CrewAI tools have a 'name' attribute
            t_name = getattr(tool, 'name', str(tool))
            if t_name not in seen_names:
                unique_tools.append(tool)
                seen_names.add(t_name)
                
        return unique_tools

    def _resolve_agent_config(self, role_key: str, fallback_config: dict) -> Agent:
        """
        ENTERPRISE INHERITANCE LOGIC (DeepSafe)
        """
        # 1. Base Config from JSON (Deepcopy to avoid mutation)
        base_conf = self.config.get("agents", {}).get(role_key, fallback_config)
        agent_conf = copy.deepcopy(base_conf)
        
        # Initialize Metadata holder
        agent_metadata = agent_conf.get("metadata", {})
        
        # 2. Blueprint Injection
        if self.blueprint_agent:
            bp_role = self.blueprint_agent.get("role", "").lower()
            if role_key in bp_role or bp_role in role_key:
                # Merge logic: Blueprint is BASE
                agent_conf["role"] = self.blueprint_agent.get("role")
                agent_conf["goal"] = self.blueprint_agent.get("goal")
                agent_conf["backstory"] = self.blueprint_agent.get("backstory")
                
                # Merge Metadata from Blueprint
                bp_meta = self.blueprint_agent.get("metadata") or {}
                agent_metadata.update(bp_meta)

                # Dynamic Tools from Blueprint
                bp_tools = self.blueprint_agent.get("tools", [])
                if isinstance(bp_tools, list):
                    agent_conf["tools"] = self._get_tools_from_names(bp_tools)
                
                self.log(f"🧬 Agent '{role_key}' inherited from Blueprint.", "System", "info")
        
        # 3. Apply Overrides (Instance Specifics) - Highest Priority
        if self.overrides:
            for key, value in self.overrides.items():
                if key in ["role", "goal", "backstory"]:
                     agent_conf[key] = value
        
        # Resolve LLM Strategy
        global_llm_model = self.persona_data.get("llm_model")
        
        if not agent_metadata.get("provider") and global_llm_model:
            # Inference logic for legacy strings
            if "gpt" in global_llm_model:
                agent_metadata["provider"] = "openai"
                agent_metadata["model"] = global_llm_model
            elif "claude" in global_llm_model:
                agent_metadata["provider"] = "anthropic"
                agent_metadata["model"] = global_llm_model
            else:
                agent_metadata["provider"] = "deepseek"
                agent_metadata["model"] = global_llm_model

        if not agent_metadata:
             agent_metadata = {"provider": "deepseek", "model": "deepseek-chat"}
             
        agent_llm = self._get_llm_provider(agent_metadata)
        
        # Resolve String Tools to Objects if needed
        if "tools" in agent_conf and isinstance(agent_conf["tools"], list) and len(agent_conf["tools"]) > 0 and isinstance(agent_conf["tools"][0], str):
            agent_conf["tools"] = self._get_tools_from_names(agent_conf["tools"])
        
        if "tools" not in agent_conf:
             agent_conf["tools"] = [campaign_vector_search, campaign_stats] if role_key in ["analyst", "strategist"] else []

        # --- KNOWLEDGE BASE INTEGRATION (Dynamic Tools) ---
        knowledge_base = agent_conf.get("knowledge_base", [])
        if knowledge_base and isinstance(knowledge_base, list):
            kb_tools = []
            for item in knowledge_base:
                try:
                    # Expecting { type: 'url'|'file', url: '...' }
                    path = item.get("url") or item.get("path")
                    if not path: continue
                    
                    if path.startswith("http"):
                        kb_tools.append(ScrapeWebsiteTool(website_url=path))
                        self.log(f"📚 Knowledge: Added Web Scraper for {path}", "System", "info")
                    elif path.endswith(".pdf"):
                        # Verify existence
                        if os.path.exists(path):
                            kb_tools.append(PDFSearchTool(pdf=path))
                            self.log(f"📚 Knowledge: Added PDF Search for {path}", "System", "info")
                        else:
                            self.log(f"⚠️ Knowledge File not found: {path}", "System", "warning")
                    else:
                        # Default to File Read
                        if os.path.exists(path):
                            kb_tools.append(FileReadTool(file_path=path))
                            self.log(f"📚 Knowledge: Added File Reader for {path}", "System", "info")
                except Exception as e:
                    self.log(f"⚠️ Failed to load Knowledge Item '{item}': {e}", "System", "error")
            
            if kb_tools:
                # Append to existing tools
                current_tools = agent_conf.get("tools", [])
                if not isinstance(current_tools, list): current_tools = []
                agent_conf["tools"] = current_tools + kb_tools

        # --- PT-BR ENFORCEMENT (Brainwashing) ---
        pt_br_prompt = (
            "\n\nATENÇÃO: Você é um sistema brasileiro especializado em política nacional. "
            "Você DEVE PENSAR (Thought), AGIR (Action) e RESPONDER (Final Answer) "
            "EXCLUSIVAMENTE em Português do Brasil (PT-BR). "
            "Se o modelo base gerar qualquer texto em inglês, traduza instantaneamente para PT-BR antes de processar. "
            "Mantenha o tom profissional e adaptado ao contexto político brasileiro."
        )
        final_backstory = agent_conf.get("backstory", "") + pt_br_prompt

        return Agent(
            role=agent_conf.get("role"),
            goal=agent_conf.get("goal"),
            backstory=final_backstory,
            tools=agent_conf.get("tools", []),
            llm=agent_llm,
            function_calling_llm=agent_llm, 
            verbose=True,
            allow_delegation=False,
            max_iter=self.max_iter,
            step_callback=self._step_callback # Real-Time Logging Hook
        )

    def _create_agents(self) -> Dict[str, Agent]:
        """Creates Agents using Resolution Logic."""
        os.environ["CURRENT_CAMPAIGN_ID"] = self.campaign_id
        
        agents = {}
        
        defaults = {
            "analyst": {"role": "Campaign Analyst", "goal": "Analyze data", "backstory": "Expert data analyst."},
            "strategist": {"role": "Senior Strategist", "goal": "Develop strategy", "backstory": "Political veteran."},
            "planner": {"role": "Tactical Planner", "goal": "Create tasks", "backstory": "Project manager."},
            # NEW Phase 3 Agent
            "counter_intel": {"role": "Analista de Contra-Inteligência", "goal": "Encontrar falhas nos rivais", "backstory": "Especialista em debates e desconstrução de narrativas adversárias.", "tools": ["competitor_vector_search", "municipal_expenses"]}
        }
        
        # Create Core Agents
        agents["analyst"] = self._resolve_agent_config("analyst", defaults["analyst"])
        agents["strategist"] = self._resolve_agent_config("strategist", defaults["strategist"])
        agents["planner"] = self._resolve_agent_config("planner", defaults["planner"])
        agents["counter_intel"] = self._resolve_agent_config("counter_intel", defaults["counter_intel"]) # NEW
        
        # Optional Agents
        if "psychologist" in self.config.get("agents", {}):
            agents["psychologist"] = self._resolve_agent_config("psychologist", {"role": "Psychologist", "goal": "Analyze emotions", "backstory": "PhD in Psychology"})
            
        return agents
        
    def _step_callback(self, step_output: Any):
        """
        REAL-TIME LOGGING HUB
        Called by CrewAI after every agent step (Thought/Action).
        """
        try:
            # step_output is usually a AgentStep object in newly CrewAI versions
            # Structure: check 'thought', 'tool', 'tool_input', etc.
            
            # Extract basic info safely
            thought = ""
            tool_name = ""
            tool_input = ""
            
            # Inspection based on CrewAI AgentStep structure
            if hasattr(step_output, 'thought'): thought = step_output.thought
            if hasattr(step_output, 'tool'): tool_name = step_output.tool
            if hasattr(step_output, 'tool_input'): tool_input = str(step_output.tool_input)
            
            # If no structured thought, try raw output override
            if not thought and hasattr(step_output, 'result'):
                thought = str(step_output.result)
            
            # Identify Agent (Tricky in callback, usually context is bound or passed)
            # For now, we log as "Running Agent" or try to find active agent if possible.
            # CrewAI 0.x might not pass agent name in step_output directly.
            # We will use a generic name or try to infer.
            agent_role = "Active Agent" 
            if hasattr(step_output, 'agent') and hasattr(step_output.agent, 'role'):
                # GUARANTEE: Use the exact role string from the agent instance (Identity Consistency)
                agent_role = step_output.agent.role

            # Persist to DB immediately
            self.supabase.table("ai_execution_logs").insert({
                "persona_id": self.persona_data.get("id"),
                "campaign_id": self.campaign_id, # Added for Campaign-Level Streaming
                "trace_id": self.trace_id,
                "step_name": "Step Execution", 
                "agent_role": agent_role,
                "model_used": getattr(self.llm, 'model_name', 'unknown'),
                "raw_output": thought[:50000] if thought else "No thought content",
                "raw_input": tool_input[:50000] if tool_input else None, # Save tool input here
                "tool_calls": tool_name, # Save tool name here
                "is_success": True
            }).execute()
            
            print(f"📡 [Live Log] {agent_role} used {tool_name or 'Brain'}")
            
        except Exception as e:
            print(f"⚠️ Step Callback Error: {e}")

    def _log_task_finish(self, task_output: Any):
        """
        OBSERVABILITY HUB: Saves Task Completion to ai_execution_logs.
        """
        try:
            output_str = task_output.raw if hasattr(task_output, 'raw') else str(task_output)
            agent_role = getattr(task_output.agent, 'role', 'Unknown Agent')
            
            # Enterprise Logging
            try:
                self.supabase.table("ai_execution_logs").insert({
                    "persona_id": self.persona_data.get("id"),
                    "campaign_id": self.campaign_id, # Added for Campaign-Level Streaming
                    "trace_id": self.trace_id,
                    "step_name": f"Task Finished", # Distinct from Step Execution
                    "agent_role": agent_role,
                    "model_used": getattr(self.llm, 'model_name', 'unknown'),
                    "raw_output": output_str[:100000], 
                    "raw_input": "Task Context", 
                    "is_success": True
                }).execute()
            except Exception as db_err:
                print(f"[Log Error] Failed to save execution log: {db_err}")
            
            self.log(f"🏁 Task Finished by {agent_role}", "System", "success")
            
        except Exception as e:
            print(f"⚠️ Observability Error: {e}")

    def _create_tasks(self, agents: Dict[str, Agent]) -> List[Task]:
        """Creates the Task Chain with Pydantic Output."""
        analyst = agents["analyst"]
        strategist = agents["strategist"]
        planner = agents["planner"]
        
        instructions = {
            "territory": "FOCUS: Geography, Territory, Maintenance, Community Presence.",
            "ideological": "FOCUS: Message, Viral Content, Opinion, Mobilization.",
            "structural": "FOCUS: Relationships, Institutions, Professional Classes."
        }
        mode_instr = instructions.get(self.strategy_mode, instructions["territory"])
        
        task1 = Task(
            description=f"Analyze Campaign {self.campaign_id}. Use tools if possible. Identify 5 Strengths, 5 Weaknesses, 5 Opportunities. {mode_instr}",
            agent=analyst,
            expected_output="SWOT Analysis Report"
        )
        
        task2 = Task(
            description=f"Define 3 Strategic Pillars based on Analyst report. {mode_instr}. Output: List of pillars with justification.",
            agent=strategist,
            expected_output="3 Strategic Pillars",
            context=[task1]
        )
        
        task3 = Task(
            description=f"Create EXACTLY {self.task_count} Tactical Suggestions linked to pillars. Number them 1 to {self.task_count}. {mode_instr}. Tone: {self.tone}.",
            agent=planner,
            expected_output=f"{self.task_count} tactical suggestions",
            context=[task1, task2]
        )
        
        task4 = Task(
            description="Compile the FULL STRATEGIC PLAN in Markdown. Include SWOT, Narrative, Pillars, Tone, Schedule, Tactics.",
            agent=strategist,
            expected_output="Complete Markdown Strategic Plan",
            context=[task1, task2, task3]
        )
        
        # TASK 5: STRICT PYDANTIC OUTPUT
        task5 = Task(
            description=f"""
            FINAL STEP: Generate structured output with {self.task_count} strategies.
            You must map the previous tactics into the StrategiesList schema.
            """,
            agent=planner,
            expected_output="Structured Pydantic Object",
            context=[task3, task4],
            output_pydantic=StrategiesList # Strict Usage
        )
        
        tasks = [task1, task2, task3, task4, task5]
        
        if "psychologist" in agents:
            tasks.insert(2, Task(
                description="Analyze pillars for emotional triggers and propose language adjustments.",
                agent=agents["psychologist"],
                expected_output="Psychological Analysis",
                context=[task2]
            ))
            
        return tasks

    def run(self) -> Dict:
        """Execute the Crew."""
        self.log(f"🚀 Starting Genesis Crew (Trace: {self.trace_id})", "System", "info")
        self._update_persona_status('running')
        
        try:
            agents = self._create_agents()
            tasks = self._create_tasks(agents)
            
            crew = Crew(
                agents=list(agents.values()),
                tasks=tasks,
                verbose=True,
                process=Process.hierarchical if self.process_type == "hierarchical" else Process.sequential,
                manager_llm=self._create_llm(self.manager_model, 0.3) if self.process_type == "hierarchical" else None,
                task_callback=self._log_task_finish
            )
            
            result = crew.kickoff()
            
            # --- Output Extraction (Pydantic Trust) ---
            strategic_plan = ""
            # Extract Plan from Task 4
            for t in tasks:
                if "Complete Markdown" in t.expected_output and hasattr(t, 'output'):
                    strategic_plan = t.output.raw
                    break
            
            # Extract Strategies (Strict Pydantic)
            strategies = []
            if hasattr(result, 'pydantic') and result.pydantic:
                if isinstance(result.pydantic, StrategiesList):
                    strategies = [s.model_dump() for s in result.pydantic.strategies]
            elif hasattr(result, 'to_dict'):
                # Some versions of CrewAI return dict if pydantic set
                d = result.to_dict()
                if 'strategies' in d: 
                    strategies = d['strategies']
                elif 'estrategias' in d: # PT-BR Fallback
                    strategies = d['estrategias']

            # Fallback only if Pydantic failed completely (Empty result)
            if not strategies and hasattr(result, 'raw'):
                 # Minimal fallback for safety, but user wanted "Strict Removal". 
                 # We will log error instead of regexing.
                 self.log(f"⚠️ Pydantic Output Empty. Raw: {result.raw[:100]}...", "System", "error")
            
            self._update_persona_status('idle')
            return {
                "strategic_plan": strategic_plan or str(result), 
                "strategies": strategies,
                "adversarial_report": result.pydantic.model_dump() if hasattr(result, 'pydantic') and isinstance(result.pydantic, AdversarialReport) else None,
                "raw_output": str(result)
            }

        except Exception as e:
            self._update_persona_status('error')
            self.log(f"❌ Execution Failed: {e}", "System", "error")
            raise e

    def save_to_database(self, result: dict):
        """Persist results."""
        plan = result.get("strategic_plan", "")
        
        # Handle PT-BR Output keys
        strats = result.get("strategies", [])
        if not strats and "estrategias" in result:
             strats = result["estrategias"]
             self.log("🇧🇷 Detected PT-BR keys in output. Adapting...", "System", "info")
             
        # Also check raw dictionary if result came from raw output
        if not strats and isinstance(result.get("raw_output"), dict):
            if "estrategias" in result["raw_output"]:
                strats = result["raw_output"]["estrategias"]
        
        if self.run_id:
             self.supabase.table("analysis_runs").update({"strategic_plan_text": plan, "status": "completed"}).eq("id", self.run_id).execute()
        
        phase_map = {"pre_campaign": "diagnostico", "campaign": "campanha_rua", "final_sprint": "reta_final"}
        data = []
        
        for s in strats:
             # Flexible Key Mapping (EN/PT)
             title = s.get("title") or s.get("nome") or "No Title"
             desc = s.get("description") or s.get("descricao") or ""
             pillar = s.get("pillar") or s.get("pilar") or ""
             phase = s.get("phase") or "campaign"
             
             data.append({
                 "campaign_id": self.campaign_id,
                 "run_id": self.run_id,
                 "title": title,
                 "description": desc,
                 "pillar": pillar,
                 "phase": phase_map.get(phase, "campanha_rua"),
                 "status": "suggested",
                 "examples": s.get("examples") or s.get("exemplos") or []
             })
        
        if data:
            try:
                self.supabase.table("strategies").insert(data).execute()
                self.log(f"✅ Saved {len(data)} strategies to DB.", "System", "success")
            except Exception as e:
                self.log(f"❌ DB Save Failed: {e}", "System", "error")
        else:
            self.log("⚠️ No strategies found to save.", "System", "warning")


    def run_adversarial_analysis(self, competitor_name: str) -> Dict:
        """
        PHASE 3: ADVERSARIAL ENGINE EXECUTION
        Runs a specialized Crew to analyze a specific competitor.
        """
        self.log(f"🕵️ Starting Adversarial Analysis against '{competitor_name}'", "System", "info")
        self._update_persona_status('running')
        
        try:
            # 1. Setup Agent
            agents = self._create_agents()
            counter_intel_agent = agents.get("counter_intel")
            
            if not counter_intel_agent:
                raise ValueError("Agent 'counter_intel' not configured correctly.")

            # 2. Create Task
            adversarial_task = Task(
                description=f"""
                ANÁLISE ADVERSÁRIA: {competitor_name}
                
                1. Use a ferramenta 'Competitor Vector Search' para buscar o plano de governo de '{competitor_name}'.
                2. Busque por temas críticos: 'segurança', 'saúde', 'dívida', 'impostos'.
                3. Identifique pelo menos 3 pontos fracos (contradições, promessas vagas, ou riscos fiscais).
                4. Para cada ponto fraco, formule um contra-ataque narrativo para o nosso candidato.
                
                Gere um RELATÓRIO DE COLISÃO estruturado.
                """,
                agent=counter_intel_agent,
                expected_output="Adversarial Report JSON",
                output_pydantic=AdversarialReport
            )
            
            # 3. Run Mini-Crew
            crew = Crew(
                agents=[counter_intel_agent],
                tasks=[adversarial_task],
                verbose=True,
                process=Process.sequential,
                task_callback=self._log_task_finish
            )
            
            result = crew.kickoff()
            
            # 4. Extract Result
            report = None
            if hasattr(result, 'pydantic') and isinstance(result.pydantic, AdversarialReport):
                report = result.pydantic.model_dump()
            elif hasattr(result, 'to_dict'):
                 report = result.to_dict()
            
            self._update_persona_status('idle')
            return {
                "status": "success",
                "report": report,
                "raw": str(result)
            }
            
        except Exception as e:
            self.log(f"❌ Adversarial Analysis Failed: {e}", "System", "error")
            self._update_persona_status('error')
            raise e

    def execute(self):
        try:
            result = self.run()
            self.save_to_database(result)
            return {"status": "success", "strategies_count": len(result.get("strategies", []))}
        except Exception as e:
             # Already handled in run(), but double check
             self._update_persona_status('error')
             raise e
