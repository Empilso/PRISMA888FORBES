import os
import json
from typing import List, Dict, Any
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from src.crew.tools import campaign_vector_search, campaign_stats

load_dotenv()


def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


# --- Pydantic Models ---
class Strategy(BaseModel):
    title: str = Field(..., description="Nome da ação tática")
    description: str = Field(..., description="Descrição detalhada da ação")
    pillar: str = Field(..., description="Pilar estratégico vinculado")
    phase: str = Field(..., description="Fase da campanha (pre_campaign, campaign, final_sprint)")

class CampaignOutput(BaseModel):
    """Output completo da Genesis Crew com plano estratégico e táticas"""
    strategic_plan: str = Field(
        ..., 
        description="Plano estratégico completo em Markdown com: análise SWOT, narrativa central, tom de voz, cronograma macro e mensagens-chave"
    )
    strategies: List[Strategy] = Field(
        ..., 
        description="Lista de estratégias táticas específicas (quantidade definida pela persona)"
    )


class GenesisCrew:
    """
    Genesis Crew: Equipe de IA que gera estratégias para campanhas políticas.
    
    Fluxo:
    1. Analista → Analisa dados e documentos, gera relatório de forças/fraquezas
    2. Estrategista → Define 3 pilares estratégicos baseados na análise
    3. Planejador → Gera 10 sugestões táticas específicas
    """
    
    def __init__(self, campaign_id: str, persona: str = "standard", run_id: str = None):
        self.campaign_id = campaign_id
        self.persona = persona
        self.run_id = run_id  # ID da execução para logging
        self.supabase = get_supabase_client()
        
        # Busca a persona do banco de dados
        try:
            persona_response = self.supabase.table("personas") \
                .select("name, config, llm_model") \
                .eq("name", persona) \
                .eq("is_active", True) \
                .execute()
            
            # Verifica se encontrou algum resultado
            if not persona_response.data or len(persona_response.data) == 0:
                self.log(f"Persona '{persona}' não encontrada. Buscando fallback...", "System", "warning")
                # Busca qualquer persona ativa
                persona_response = self.supabase.table("personas") \
                    .select("name, config, llm_model") \
                    .eq("is_active", True) \
                    .limit(1) \
                    .execute()
                
                if not persona_response.data or len(persona_response.data) == 0:
                    self.log("CRÍTICO: Nenhuma persona ativa encontrada!", "System", "error")
                    raise ValueError("❌ CRÍTICO: Nenhuma persona ativa encontrada no banco de dados!")
                
                self.persona = persona_response.data[0]["name"]
                self.log(f"Usando persona '{self.persona}' como fallback", "System", "info")
            
            persona_data = persona_response.data[0]
            
            # Validação defensiva do campo config
            if "config" not in persona_data or not persona_data["config"]:
                raise ValueError(f"Persona '{self.persona}' não possui campo 'config' válido")
            
            self.personas = persona_data["config"]
            
            # ===== PARÂMETROS DE EXECUÇÃO (do config) =====
            # Lê os parâmetros avançados definidos no frontend
            self.task_count = self.personas.get("task_count", 10)
            self.temperature = self.personas.get("temperature", 0.7)
            self.max_iter = self.personas.get("max_iter", 15)
            self.num_examples = self.personas.get("num_examples", 2)
            self.process_type = self.personas.get("process_type", "sequential")
            
            self.log(
                f"📊 Config: {self.task_count} tarefas, temp={self.temperature}, "
                f"max_iter={self.max_iter}, exemplos={self.num_examples}, processo={self.process_type}", 
                "System", "info"
            )
            
            # Seleciona o modelo LLM baseado na configuração da persona
            llm_model = persona_data.get("llm_model") or "gpt-4o-mini"
            self.log(f"Inicializando LLM: {llm_model}", "System", "info")
            self.llm = self._create_llm(llm_model, self.temperature)
            
        except Exception as e:
            self.log(f"Erro ao inicializar: {e}", "System", "error")
            raise ValueError(f"Erro ao inicializar persona: {e}")
    
    def log(self, message: str, agent_name: str = None, status: str = "info", agent: str = None):
        """
        Registra um log em tempo real no banco de dados para telemetria.
        
        Args:
            message: Mensagem do log
            agent_name: Nome do agente (Analista, Estrategista, Planejador, System)
            agent: Alias para agent_name (compatibilidade com _log_step)
            status: 'info', 'success', 'error', 'warning'
        """
        # Aceita tanto 'agent' quanto 'agent_name' como argumento
        final_agent = agent or agent_name or "System"
        
        try:
            print(f"[{final_agent}] {message}")  # Console local também
            
            if self.run_id:  # Só loga no banco se tiver run_id
                self.supabase.table("agent_logs").insert({
                    "run_id": self.run_id,
                    "campaign_id": self.campaign_id,
                    "agent_name": final_agent,
                    "message": message,
                    "status": status
                }).execute()
        except Exception as e:
            print(f"⚠️ Erro ao salvar log: {e}")
    
    def _create_llm(self, model_name: str, temperature: float = 0.7):
        """
        Cria a instância do LLM baseado no modelo selecionado.
        O CrewAI usa LiteLLM internamente, então basta passar o modelo corretamente.
        Suporta: OpenRouter, Groq, OpenAI nativo
        
        Args:
            model_name: Nome do modelo (ex: "gpt-4o-mini", "openrouter/x-ai/grok-beta")
            temperature: Nível de criatividade (0.0 a 1.0)
        """
        # Configura as chaves de API como variáveis de ambiente
        if model_name.startswith("openrouter/"):
            openrouter_key = os.getenv("OPENROUTER_API_KEY")
            if not openrouter_key:
                raise ValueError("OPENROUTER_API_KEY não configurada no .env")
            os.environ["OPENROUTER_API_KEY"] = openrouter_key
        
        elif model_name.startswith("groq/"):
            groq_key = os.getenv("GROQ_API_KEY")
            if not groq_key:
                raise ValueError("GROQ_API_KEY não configurada no .env")
            os.environ["GROQ_API_KEY"] = groq_key
        
        # Cria um LLM básico do LangChain
        # O CrewAI vai detectar o prefixo e rotear via LiteLLM
        return ChatOpenAI(
            model=model_name,  # Mantém o prefixo completo: "groq/llama3-70b-8192"
            temperature=temperature  # Usa a temperatura do config
        )
    
    def _log_step(self, step_output: Any):
        """
        🎙️ MICROFONE DA IA - Captura cada passo do pensamento do Agente
        
        Este callback intercepta todos os pensamentos, decisões e ações dos agentes,
        transmitindo em tempo real para o console frontend via Supabase Realtime.
        """
        try:
            # 1. CAPTURA DO PENSAMENTO (Thought Chain)
            if hasattr(step_output, 'thought') and step_output.thought:
                clean_thought = step_output.thought.strip()
                if clean_thought:
                    # Remove blocos de código markdown para deixar mais limpo
                    if clean_thought.startswith("```") and clean_thought.endswith("```"):
                        clean_thought = clean_thought[3:-3].strip()
                    
                    # Limita o tamanho mas mantém o contexto
                    if len(clean_thought) > 500:
                        clean_thought = clean_thought[:500] + "..."
                    
                    self.log(f"💭 Pensamento: {clean_thought}", agent="AI Brain", status="info")
            
            # 2. CAPTURA DE USO DE FERRAMENTA
            if hasattr(step_output, 'tool') and step_output.tool:
                tool_name = step_output.tool
                self.log(f"🛠️ Iniciando ferramenta: {tool_name}", agent="Tool", status="warning")
                
                # 3. CAPTURA DO INPUT DA FERRAMENTA
                if hasattr(step_output, 'tool_input') and step_output.tool_input:
                    tool_input_str = str(step_output.tool_input)
                    
                    # Trunca inputs muito grandes
                    if len(tool_input_str) > 200:
                        tool_input_str = tool_input_str[:200] + "... [truncado]"
                    
                    self.log(f"📥 Input da ferramenta: {tool_input_str}", agent="Tool", status="info")
            
            # 4. CAPTURA DO RESULTADO DA FERRAMENTA (Observation)
            if hasattr(step_output, 'result') and step_output.result:
                result_str = str(step_output.result)
                
                # Detecta se é um resultado vazio ou erro
                if not result_str or result_str.lower() in ["none", "null", ""]:
                    self.log("⚠️ Ferramenta retornou vazio", agent="Tool", status="warning")
                else:
                    # Trunca resultados muito grandes
                    if len(result_str) > 300:
                        result_str = result_str[:300] + "... [ver mais no output final]"
                    
                    self.log(f"✅ Resultado: {result_str}", agent="Tool", status="info")
            
            # 5. CAPTURA DE AÇÃO (Action) - Se disponível
            if hasattr(step_output, 'action') and step_output.action:
                action_str = str(step_output.action)
                if len(action_str) > 200:
                    action_str = action_str[:200] + "..."
                self.log(f"⚡ Ação: {action_str}", agent="Action", status="warning")
            
            # 6. CAPTURA DE OBSERVAÇÃO (Observation) - Formato alternativo
            if hasattr(step_output, 'observation') and step_output.observation:
                obs_str = str(step_output.observation)
                if len(obs_str) > 300:
                    obs_str = obs_str[:300] + "..."
                self.log(f"👁️ Observação: {obs_str}", agent="Observer", status="info")

        except Exception as e:
            # Não falha silenciosamente - reporta o erro mas continua
            print(f"⚠️ Erro ao capturar step: {e}")
            self.log(f"⚠️ Erro ao capturar pensamento: {str(e)[:100]}", agent="System", status="error")
    
    def _create_agents(self) -> Dict[str, Agent]:
        """
        Cria os agentes da crew dinamicamente baseado no config.
        Suporta tanto o novo formato (config.agents) quanto o legado (analyst/strategist/planner).
        
        Returns:
            Dict[str, Agent]: Dicionário mapeando id -> Agent
        """
        
        # Define o campaign_id como variável de ambiente para as tools
        os.environ["CURRENT_CAMPAIGN_ID"] = self.campaign_id
        
        max_iter = self.max_iter
        created_agents = {}
        
        # Novo formato: config.agents é um dicionário
        if "agents" in self.personas and isinstance(self.personas["agents"], dict):
            agents_config = self.personas["agents"]
            self.log(f"🤖 Criando {len(agents_config)} agentes dinâmicos", "System", "info")
            
            for agent_id, agent_config in agents_config.items():
                # Determina se este agente precisa de ferramentas de pesquisa
                needs_tools = agent_id in ["analyst", "researcher"]
                tools = [campaign_vector_search, campaign_stats] if needs_tools else []
                
                agent = Agent(
                    role=agent_config.get("role", f"Agente {agent_id}"),
                    goal=agent_config.get("goal", "Contribuir para a campanha"),
                    backstory=agent_config.get("backstory", "Membro experiente da equipe."),
                    tools=tools,
                    llm=self.llm,
                    verbose=True,
                    allow_delegation=False,
                    max_iter=max_iter
                )
                created_agents[agent_id] = agent
                self.log(f"  ✓ {agent_config.get('role', agent_id)}", "System", "info")
        
        else:
            # Fallback: formato legado (3 agentes fixos)
            self.log("🤖 Criando 3 agentes (formato legado)", "System", "info")
            
            created_agents["analyst"] = Agent(
                role=self.personas.get("analyst", {}).get("role", "Analista"),
                goal=self.personas.get("analyst", {}).get("goal", "Analisar dados"),
                backstory=self.personas.get("analyst", {}).get("backstory", "Especialista em dados."),
                tools=[campaign_vector_search, campaign_stats],
                llm=self.llm,
                verbose=True,
                allow_delegation=False,
                max_iter=max_iter
            )
            
            created_agents["strategist"] = Agent(
                role=self.personas.get("strategist", {}).get("role", "Estrategista"),
                goal=self.personas.get("strategist", {}).get("goal", "Definir estratégia"),
                backstory=self.personas.get("strategist", {}).get("backstory", "Consultor experiente."),
                llm=self.llm,
                verbose=True,
                allow_delegation=False,
                max_iter=max_iter
            )
            
            created_agents["planner"] = Agent(
                role=self.personas.get("planner", {}).get("role", "Planejador"),
                goal=self.personas.get("planner", {}).get("goal", "Criar planos táticos"),
                backstory=self.personas.get("planner", {}).get("backstory", "Gerente de projeto."),
                llm=self.llm,
                verbose=True,
                allow_delegation=False,
                max_iter=max_iter
            )
        
        # Salva a lista de IDs de agentes para uso posterior
        self.agent_ids = list(created_agents.keys())
        
        return created_agents
    def _create_tasks(self, agents: Dict[str, Agent]) -> List[Task]:
        """
        Cria as tarefas da crew baseado nos agentes disponíveis.
        
        Para templates com mais/menos agentes, adapta as tarefas dinamicamente.
        Tarefas são atribuídas aos papéis conhecidos ou ao primeiro agente disponível.
        """
        
        # Busca agentes por papel (com fallback)
        analyst = agents.get("analyst") or agents.get("researcher") or list(agents.values())[0]
        strategist = agents.get("strategist") or list(agents.values())[min(1, len(agents)-1)]
        planner = agents.get("planner") or agents.get("writer") or list(agents.values())[-1]
        
        task1 = Task(
            description=f"""
            Analise PROFUNDAMENTE a campanha {self.campaign_id}.
            
            Passos:
            1. Use a ferramenta campaign_stats para entender os dados eleitorais
            2. Use campaign_vector_search para ler o Plano de Governo (busque por temas variados)
            3. Identifique:
               - 5 PONTOS FORTES (dados, propostas, histórico)
               - 5 PONTOS FRACOS (lacunas, vulnerabilidades)
               - 5 OPORTUNIDADES (contexto político, demandas não atendidas)
            
            Formato de saída: Relatório estruturado em tópicos com justificativa para cada item.
            """,
            agent=analyst,
            expected_output="Relatório detalhado com pontos fortes, fracos e oportunidades"
        )
        
        task2 = Task(
            description="""
            Baseado no relatório do Analista, defina OS 3 PILARES ESTRATÉGICOS da campanha.
            
            Cada pilar deve:
            - Ser um tema/narrativa central (ex: "Saúde de Qualidade", "Cidade Inteligente")
            - Conectar com os pontos fortes identificados
            - Mitigar os pontos fracos
            - Explorar as oportunidades
            
            Formato de saída: Lista com 3 pilares, cada um com:
            - Nome do Pilar
            - Justificativa (2-3 frases)
            - Mensagem-chave para comunicação
            """,
            agent=strategist,
            expected_output="3 pilares estratégicos com nome, justificativa e mensagem-chave",
            context=[task1]
        )
        
        # Instrução de exemplos (se configurado)
        examples_instruction = ""
        if self.num_examples > 0:
            examples_instruction = f"""
            
            Para cada tática, forneça EXATAMENTE {self.num_examples} exemplo(s) prático(s) de execução.
            Formato do exemplo: "Ex: [descrição concreta da ação]" """
        
        task3 = Task(
            description=f"""
            Crie {self.task_count} SUGESTÕES TÁTICAS CONCRETAS baseadas nos 3 pilares estratégicos.
            
            Cada sugestão deve:
            - Estar vinculada a um dos 3 pilares
            - Ser uma ação específica e executável
            - Ter objetivo claro e mensurável
            - Indicar a fase da campanha (pre_campaign, campaign, final_sprint)
            {examples_instruction}
            
            Formato: Lista JSON de estratégias
            
            IMPORTANTE: Gere EXATAMENTE {self.task_count} táticas, nem mais nem menos.
            """,
            agent=planner,
            expected_output=f"Lista com {self.task_count} táticas específicas" + (f", cada uma com {self.num_examples} exemplos" if self.num_examples > 0 else ""),
            context=[task1, task2]
        )
        
        task4 = Task(
            description=f"""
            COMPILE O DOSSIÊ ESTRATÉGICO COMPLETO DA CAMPANHA.
            
            Você deve criar um documento em Markdown unificado que contenha:
            
            # 📊 PLANO ESTRATÉGICO DA CAMPANHA
            
            ## 1. ANÁLISE SWOT
            [Resumo executivo dos pontos fortes, fracos e oportunidades identificados pelo Analista]
            
            ## 2. NARRATIVA CENTRAL
            [A história que queremos contar. Por que este candidato? Qual a mudança que propõe?]
            
            ## 3. PILARES ESTRATÉGICOS
            [Os 3 pilares definidos pelo Estrategista, com mensagens-chave]
            
            ## 4. TOM DE VOZ
            [Como devemos nos comunicar? Formal/Informal? Técnico/Acessível? Com exemplos]
            
            ## 5. CRONOGRAMA MACRO
            [Divisão por fases: Diagnóstico, Campanha de Rua, Reta Final]
            
            ## 6. TÁTICAS PRINCIPAIS
            [Breve resumo das {self.task_count} táticas que serão executadas]
            
            IMPORTANTE: Use Markdown para formatação (headers, listas, bold, etc.)
            Seja conciso mas completo. Máximo 2000 palavras.
            """,
            agent=strategist,
            expected_output="Documento Markdown completo do plano estratégico",
            context=[task1, task2, task3]
        )
        
        # Task final que combina tudo
        task5 = Task(
            description=f"""
            GERE O OUTPUT FINAL COMBINADO.
            
            Você deve retornar um JSON com dois campos:
            - strategic_plan: O documento Markdown completo do plano estratégico
            - strategies: A lista de {self.task_count} táticas geradas anteriormente
            
            FORMATO OBRIGATÓRIO:
            {{
                "strategic_plan": "# Plano Estratégico\\n\\n## 1. Análise SWOT\\n...",
                "strategies": [
                    {{"title": "...", "description": "...", "pillar": "...", "phase": "..."}},
                    ...
                ]
            }}
            """,
            agent=planner,
            expected_output="JSON com strategic_plan e strategies",
            context=[task1, task2, task3, task4],
            output_json=CampaignOutput
        )
        
        # Monta a lista de tarefas base
        tasks = [task1, task2, task3, task4, task5]
        
        # === TAREFAS EXTRAS PARA TEMPLATES MAIORES ===
        
        # Tarefa do Psicólogo (se existir)
        if "psychologist" in agents:
            task_psychologist = Task(
                description="""
                Analise os pilares estratégicos e o público-alvo sob a perspectiva PSICOLÓGICA.
                
                Para cada pilar, identifique:
                - Quais MEDOS do eleitorado ele mitiga?
                - Quais DESEJOS ele ativa?
                - Qual é o gatilho emocional mais poderoso?
                
                Sugira ajustes de LINGUAGEM para maximizar conexão emocional.
                """,
                agent=agents["psychologist"],
                expected_output="Análise psicológica dos pilares com sugestões de linguagem emocional",
                context=[task1, task2]
            )
            # Insere após task2 (pilares)
            tasks.insert(2, task_psychologist)
        
        # Tarefa do Crítico/Advogado do Diabo (se existir)
        if "critic" in agents:
            task_critic = Task(
                description="""
                CRITIQUE IMPIEDOSAMENTE as estratégias propostas.
                
                Para cada tática:
                - Como um ADVERSÁRIO poderia atacar ou desconstruir?
                - Qual é o ponto fraco mais óbvio?
                - O que a IMPRENSA poderia questionar?
                
                Sugira BLINDAGENS e contra-argumentos para cada vulnerabilidade.
                """,
                agent=agents["critic"],
                expected_output="Análise crítica das táticas com blindagens sugeridas",
                context=[task3]  # Analisa as táticas
            )
            # Insere antes da task final
            tasks.insert(-1, task_critic)
        
        return tasks
    
    def run(self) -> Dict:
        """
        Executa a Genesis Crew e retorna o plano estratégico + estratégias.
        
        Returns:
            Dict com 'strategic_plan' (str) e 'strategies' (list)
        """
        self.log(f"Iniciando análise da campanha {self.campaign_id}", "System", "info")
        
        # Cria agentes (agora retorna Dict[str, Agent])
        agents_dict = self._create_agents()
        self.log(f"🤖 Equipe de {len(agents_dict)} agentes pronta: {', '.join(agents_dict.keys())}", "System", "info")
        
        # Cria tarefas (passa o dict de agentes)
        tasks = self._create_tasks(agents_dict)
        
        # Cria e executa a crew com processo configurável
        process_label = "hierárquico (gerente)" if self.process_type == "hierarchical" else "sequencial (linha de montagem)"
        self.log(f"Iniciando trabalho com {len(tasks)} tarefas em modo {process_label}", "System", "info")
        
        # Define o processo baseado no config
        crew_process = Process.hierarchical if self.process_type == "hierarchical" else Process.sequential
        
        # Lista de agentes para a Crew (valores do dict)
        agents_list = list(agents_dict.values())
        
        # Configura parâmetros da Crew
        crew_params = {
            "agents": agents_list,
            "tasks": tasks,
            "verbose": True,
            "max_rpm": 10,  # Limita a 10 requisições/min para evitar rate limit (Groq, OpenRouter)
            "step_callback": self._log_step,
            "process": crew_process
        }
        
        # Se hierárquico, adiciona manager_llm (usa o mesmo LLM dos agentes)
        if self.process_type == "hierarchical":
            crew_params["manager_llm"] = self.llm
            self.log("🎩 Modo Hierárquico: Um gerente coordenará os agentes", "System", "info")
        
        crew = Crew(**crew_params)
        
        self.log("Equipe iniciada! Agentes começando a trabalhar...", "Analista", "info")
        result = crew.kickoff()
        
        # O resultado agora é um objeto CrewOutput
        try:
            # Verifica se é um objeto CrewOutput e tenta extrair o Pydantic model
            if hasattr(result, 'pydantic') and result.pydantic:
                if hasattr(result.pydantic, 'strategic_plan') and hasattr(result.pydantic, 'strategies'):
                    return {
                        'strategic_plan': result.pydantic.strategic_plan,
                        'strategies': [s.model_dump() for s in result.pydantic.strategies]
                    }
                return result.pydantic.model_dump()
            
            # Tenta extrair do json_dict
            if hasattr(result, 'json_dict') and result.json_dict:
                if 'strategic_plan' in result.json_dict and 'strategies' in result.json_dict:
                    return result.json_dict
                # Fallback para formato antigo
                if 'strategies' in result.json_dict:
                    return {
                        'strategic_plan': "# Plano Estratégico\n\nPlano não disponível nesta versão.",
                        'strategies': result.json_dict['strategies']
                    }
                return result.json_dict
                
            # Tenta extrair do raw string
            raw_output = ""
            if hasattr(result, 'raw'):
                raw_output = result.raw
            elif isinstance(result, str):
                raw_output = result
                
            if raw_output:
                print(f"⚠️ Recebido raw output, tentando parsear: {raw_output[:100]}...")
                result_clean = raw_output.strip()
                if result_clean.startswith("```json"):
                    result_clean = result_clean[7:]
                if result_clean.startswith("```"):
                    result_clean = result_clean[3:]
                if result_clean.endswith("```"):
                    result_clean = result_clean[:-3]
                
                data = json.loads(result_clean.strip())
                if 'strategic_plan' in data and 'strategies' in data:
                    return data
                # Fallback para formato antigo
                if 'strategies' in data:
                    return {
                        'strategic_plan': "# Plano Estratégico\n\nPlano não disponível nesta versão.",
                        'strategies': data['strategies']
                    }
                return data
            
            raise ValueError(f"Não foi possível extrair dados do resultado: {type(result)}")
        
        except Exception as e:
            print(f"❌ Erro ao processar resultado: {e}")
            print(f"Resultado bruto: {result}")
            raise ValueError(f"Erro no processamento do resultado: {e}")
    
    def save_to_database(self, result: dict):
        """
        Salva o resultado da execução no banco de dados com versionamento.
        
        Fluxo:
        1. Cria um registro em 'analysis_runs' (versão da análise)
        2. Salva estratégias vinculadas ao 'run_id'
        3. Atualiza o plano na campanha (campo legado)
        """
        supabase = get_supabase_client()
        
        strategic_plan = result.get('strategic_plan', '')
        strategies = result.get('strategies', [])
        
        # 1. Criar registro de execução (VERSÃO)
        try:
            run_result = supabase.table("analysis_runs").insert({
                "campaign_id": self.campaign_id,
                "persona_name": self.persona,
                "llm_model": self.llm.model_name if hasattr(self.llm, 'model_name') else "unknown",
                "strategic_plan_text": strategic_plan
            }).execute()
            
            run_id = run_result.data[0]["id"]
            print(f"📦 Run #{run_id} criada para campanha {self.campaign_id}")
        except Exception as e:
            print(f"❌ Erro ao criar analysis_run: {e}")
            raise e
        
        # 2. Salvar o plano estratégico na campanha (campo legado - mantém compatibilidade)
        try:
            supabase.table("campaigns").update({
                "ai_strategic_plan": strategic_plan
            }).eq("id", self.campaign_id).execute()
            
            print(f"📄 Plano estratégico salvo na campanha {self.campaign_id}")
        except Exception as e:
            print(f"⚠️ Erro ao salvar plano estratégico: {e}")
        
        # 3. Salvar as táticas vinculadas à run
        # Mapeamento de fases para o enum do banco
        phase_map = {
            "pre_campaign": "diagnostico",
            "campaign": "campanha_rua",
            "final_sprint": "reta_final"
        }
        
        # Prepara os dados para inserção
        strategies_data = []
        for suggestion in strategies:
            raw_phase = suggestion.get("phase", "campaign")
            db_phase = phase_map.get(raw_phase, "campanha_rua")
            
            strategies_data.append({
                "campaign_id": self.campaign_id,
                "run_id": run_id,  # Vínculo com a versão
                "title": suggestion.get("title", ""),
                "description": suggestion.get("description", ""),
                "pillar": suggestion.get("pillar", ""),
                "phase": db_phase,
                "status": "suggested"
            })
        
        # Insere no banco
        result = supabase.table("strategies").insert(strategies_data).execute()
        
        print(f"✅ {len(strategies_data)} estratégias salvas no banco (run_id: {run_id})!")
        return result
    
    def execute(self):
        """
        Executa o fluxo completo: gera plano + estratégias e salva no banco.
        
        Returns:
            Dict com status, plano estratégico e quantidade de estratégias
        """
        try:
            result = self.run()
            self.save_to_database(result)
            
            return {
                "status": "success",
                "has_strategic_plan": bool(result.get('strategic_plan')),
                "strategies_generated": len(result.get('strategies', [])),
                "campaign_id": self.campaign_id
            }
        
        except Exception as e:
            print(f"❌ Erro na execução: {e}")
            raise e
