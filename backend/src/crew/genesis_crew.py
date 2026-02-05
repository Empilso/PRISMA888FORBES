import os
import json
import re
from typing import List, Dict, Any, Sequence
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import httpx

# Agora importamos o resto que depende de litellm/crewai
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

from src.crew.tools import campaign_vector_search, campaign_stats

load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


def parse_examples(text: str) -> Dict[str, Any]:
    """
    Extrai exemplos do texto da descrição.
    
    Input: "Descrição da tática\n\nEx: Fazer X\nEx: Fazer Y"
    Output: { "description": "Descrição da tática", "examples": ["Fazer X", "Fazer Y"] }
    """
    if not text:
        return {"description": "", "examples": []}
    
    # Pattern to match "Ex:", "Ex 1:", "Exemplo:", "Exemplo 1:" etc.
    pattern = r'(?:Ex(?:emplo)?(?:\s*\d*)?[:\.])\s*(.+?)(?=\n(?:Ex|Exemplo)|$)'
    examples = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
    
    # Clean extracted examples
    examples = [ex.strip() for ex in examples if ex.strip()]
    
    # Remove examples from description
    clean_description = re.sub(
        r'(?:\n\n?)?(?:Ex(?:emplo)?(?:\s*\d*)?[:\.])\s*.+?(?=\n(?:Ex|Exemplo)|$)',
        '',
        text,
        flags=re.IGNORECASE | re.DOTALL
    ).strip()
    
    return {"description": clean_description, "examples": examples}


def clean_json_output(raw_text: str) -> str:
    """
    Limpa e tenta reparar JSONs gerados por LLMs.
    Corrigie markdown wrapping, vírgulas soltas e chaves não fechadas.
    """
    if not raw_text:
        return "{}"

    # Remove Markdown wrapping
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    # Remove textos antes da primeira { ou [
    start_bracket = text.find('{')
    if start_bracket == -1:
        start_bracket = text.find('[')
    
    if start_bracket != -1:
        text = text[start_bracket:]
        
    # Remove textos após a última } ou ]
    end_bracket = text.rfind('}')
    if end_bracket == -1:
        end_bracket = text.rfind(']')
        
    if end_bracket != -1:
        text = text[:end_bracket+1]

    # Tenta reparar JSON quebrado (comum em truncamento)
    # Adiciona chaves de fechamento se estiverem faltando
    open_braces = text.count('{') - text.count('}')
    if open_braces > 0:
        text += '}' * open_braces
        
    open_brackets = text.count('[') - text.count(']')
    if open_brackets > 0:
        text += ']' * open_brackets
        
    return text


def recover_data_from_broken_json(raw_text: str) -> Dict[str, Any]:
    """
    Tenta recuperar dados de um JSON quebrado/truncado usando Regex.
    Salva o que der para salvar (Plano + Estratégias sobreviventes).
    
    Args:
        raw_text: Texto original do LLM (pode estar incompleto)
        
    Returns:
        Dict com 'strategic_plan' e 'strategies' (parcial)
    """
    if not raw_text:
        return {"strategic_plan": "", "strategies": []}
        
    recovered_data = {
        "strategic_plan": "# Plano Estratégico (Recuperado)\n\n" + raw_text, # Default
        "strategies": []
    }
    
    # 1. Tenta extrair o Strategic Plan
    # Procura por "strategic_plan": "..."
    # Regex gancioso para pegar conteudo até o começo das strategies ou fim
    plan_match = re.search(r'"strategic_plan"\s*:\s*"(.*?)(?=",\s*"strategies")', raw_text, re.DOTALL)
    if plan_match:
        # Desescapa strings JSON básicas (ex: \n, \")
        decoded_plan = plan_match.group(1).replace('\\n', '\n').replace('\\"', '"')
        recovered_data["strategic_plan"] = decoded_plan
    
    # 2. Tenta extrair Estratégias Individuais
    # Procura por blocos que parecem objetos de estratégia: { ... "title": ... "description": ... }
    # O regex busca chaves balanceadas de forma simplificada (assume que não há } dentro de strings, o que é um risco aceitável para fallback)
    
    # Revised Regex: Looks for objects containing both "title" and "description" keys in any order
    # Matches { ... "title": ... "description": ... } OR { ... "description": ... "title": ... }
    # Uses [^{}]* to avoid capturing too much, but essentially grabs the object block.
    # We use a non-greedy catch-all between keys.
    strategy_matches = re.findall(r'(\{(?:[^{}]|"(?:\\.|[^"\\])*")*?"title"\s*:(?:[^{}]|"(?:\\.|[^"\\])*")*?"description"\s*:(?:[^{}]|"(?:\\.|[^"\\])*")*?\})', raw_text, re.DOTALL)
    
    successful_recoveries = 0
    for match in strategy_matches:
        try:
            # Tenta limpar e parsear o pedaço individualmente
            # Pode precisar fechar chaves se o regex pegou algo incompleto (improvável com o regex acima, mas possível se aninhado)
            strat_obj = json.loads(match)
            recovered_data["strategies"].append(strat_obj)
            successful_recoveries += 1
        except:
            # Se falhar o load direto, tenta limpar trailing commas
            try:
                clean_match = re.sub(r',\s*\}', '}', match)
                strat_obj = json.loads(clean_match)
                recovered_data["strategies"].append(strat_obj)
                successful_recoveries += 1
            except:
                pass # Pula estratégia irrecuperável
                
    print(f"[Guardrail] 🩹 Regex Recovery: {successful_recoveries} estratégias salvas de {len(strategy_matches)} encontradas.")
    
    return recovered_data


# ... resto do arquivo segue ...




class SimpleDeepSeekClient:
    """
    Cliente HTTP direto para DeepSeek para evitar incompatibilidades de payload
    que ocorrem com langchain_openai.ChatOpenAI e CrewAI.
    """
    def __init__(self, api_key: str, model: str = "deepseek-chat", temperature: float = 0.7):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.base_url = "https://api.deepseek.com/v1/chat/completions"

    def chat_completion(self, messages: List[Dict[str, str]]) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": 8192
        }
        
        try:
            response = httpx.post(self.base_url, headers=headers, json=payload, timeout=60.0)
            if response.status_code != 200:
                print(f"[DeepSeek ERROR] Status: {response.status_code} Body: {response.text}")
                raise ValueError(f"DeepSeek API Error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[DeepSeek FAIL] {str(e)}")
            raise e

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from pydantic import PrivateAttr, ConfigDict

# Mock classes para enganar chamadas diretas ao client OpenAI
class MockCompletions:
    def __init__(self, deepseek_client, model_name):
        self.deepseek = deepseek_client
        self.model_name = model_name

    def create(self, messages, model=None, **kwargs):
        print(f"[DeepSeekLLM] 🕵️ MockClient intercepted call for {model or self.model_name}")
        
        # Converte formato OpenAI (dicts) -> SimpleDeepSeekClient
        # Na verdade o SimpleDeepSeekClient já espera dicts/list of dicts
        
        response_content = self.deepseek.chat_completion(messages)
        
        # Cria resposta fake compatível com OpenAI object
        # Precisamos retornar um objeto que tenha .choices[0].message.content
        return MockResponse(response_content, model or self.model_name)

class MockChat:
    def __init__(self, deepseek_client, model_name):
        self.completions = MockCompletions(deepseek_client, model_name)

class MockClient:
    def __init__(self, deepseek_client, model_name):
        self.chat = MockChat(deepseek_client, model_name)

class MockResponse:
    def __init__(self, content, model):
        self.id = "chatcmpl-mock-deepseek"
        self.object = "chat.completion"
        self.created = 1234567890
        self.model = model
        self.choices = [MockChoice(content)]

class MockChoice:
    def __init__(self, content):
        self.index = 0
        self.message = MockMessage(content)
        self.finish_reason = "stop"

class MockMessage:
    def __init__(self, content):
        self.role = "assistant"
        self.content = content
        self.function_call = None
        self.tool_calls = None

class DeepSeekLLM(ChatOpenAI):
    """
    Adapter 'Cavalo de Tróia' Supremo.
    Herda de ChatOpenAI E substitui o client interno por um Mock.
    """
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    # Cliente HTTP direto (escondido)
    client_http: Any = Field(default=None, exclude=True)

    def __init__(self, api_key: str, model_name: str, temperature: float = 0.7, **kwargs):
        # Normalização
        clean_model = model_name.split("/")[-1] if "/" in model_name else model_name
        if clean_model not in ["deepseek-chat", "deepseek-reasoner"]:
             clean_model = "deepseek-chat"
        
        # Inicializa ChatOpenAI
        super().__init__(
            model=clean_model,
            api_key=api_key,
            base_url="https://api.deepseek.com/v1",
            temperature=temperature,
            **kwargs
        )
        
        print(f"[DeepSeekLLM] Trojan Horse Initialized: {id(self)} for {clean_model}")
        
        # Inicializa cliente real
        self.client_http = SimpleDeepSeekClient(api_key, clean_model, temperature)
        
        # GOLPE FINAL: Substitui o client do OpenAI pelo nosso Mock
        # Isso intercepta chamadas diretas tipo client.chat.completions.create()
        self.client = MockClient(self.client_http, clean_model)
        print(f"[DeepSeekLLM] 🕵️ OpenAI Client replaced with Mock for {clean_model}")

    @property
    def _llm_type(self) -> str:
        return "deepseek-direct-trojan"

    def bind_tools(self, tools: Sequence[Any], **kwargs: Any) -> BaseChatModel:
        print(f"[DeepSeekLLM] bind_tools blocked ({len(tools)} tools). Keeping Trojan instance.")
        return self

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: List[str] | None = None,
        run_manager: Any | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        """
        Mantemos o override do _generate por segurança, 
        caso o LangChain tente usar o caminho padrão.
        """
        # ... (código anterior de conversão)
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                formatted_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                formatted_messages.append({"role": "assistant", "content": msg.content})
            elif isinstance(msg, SystemMessage):
                formatted_messages.append({"role": "system", "content": msg.content})
            else:
                formatted_messages.append({"role": "user", "content": str(msg.content)})

        print(f"[DeepSeekLLM] Trojan _generate calls mock client explicitly")
        
        try:
            # Chama nosso mock (que chama o http client)
            mock_response = self.client.chat.completions.create(messages=formatted_messages)
            content = mock_response.choices[0].message.content
            
            generation = ChatGeneration(message=AIMessage(content=content))
            return ChatResult(generations=[generation])
        except Exception as e:
            print(f"[DeepSeekLLM] Generation Failed: {e}")
            raise e

# --- Pydantic Models ---
class Strategy(BaseModel):
    title: str = Field(..., description="Nome da ação tática")
    description: str = Field(..., description="Descrição detalhada da ação (sem exemplos)")
    pillar: str = Field(..., description="Pilar estratégico vinculado")
    phase: str = Field(..., description="Fase da campanha (pre_campaign, campaign, final_sprint)")
    examples: List[str] = Field(default=[], description="Exemplos práticos de execução")

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

class StrategiesList(BaseModel):
    """Output otimizado: apenas a lista de estratégias"""
    strategies: List[Strategy] = Field(
        ..., 
        description="Lista de estratégias táticas específicas"
    )


class GenesisCrew:
    """
    Genesis Crew: Equipe de IA que gera estratégias para campanhas políticas.
    
    Fluxo:
    1. Analista → Analisa dados e documentos, gera relatório de forças/fraquezas
    2. Estrategista → Define 3 pilares estratégicos baseados na análise
    3. Planejador → Gera 10 sugestões táticas específicas
    """
    
    def __init__(self, campaign_id: str, persona: str = "standard", run_id: str = None, strategy_mode_override: str = None):
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
            self.tone = self.personas.get("tone", "formal")
            self.process_type = self.personas.get("process_type", "sequential")
            self.manager_model = self.personas.get("manager_model", "gpt-4o")  # LLM do Manager (hierárquico)
            
            self.log(
                f"📊 Config: {self.task_count} tarefas, temp={self.temperature}, "
                f"max_iter={self.max_iter}, exemplos={self.num_examples}, tom={self.tone}, processo={self.process_type}", 
                "System", "info"
            )
            
            # Seleciona o modelo LLM baseado na configuração da persona
            llm_model = persona_data.get("llm_model") or "gpt-4o-mini"
            self.log(f"Inicializando LLM: {llm_model}", "System", "info")
            self.llm = self._create_llm(llm_model, self.temperature)
            
            # ===== CONTEXTO DA CAMPANHA (Strategy Mode) =====
            # Prioridade: 1. Override (API) > 2. Banco de Dados > 3. Default ('territory')
            if strategy_mode_override:
                self.strategy_mode = strategy_mode_override
                self.log(f"🎯 Modo de Estratégia (Override): {self.strategy_mode.upper()}", "System", "info")
            else:
                try:
                    camp_res = self.supabase.table("campaigns").select("strategy_mode").eq("id", campaign_id).single().execute()
                    self.strategy_mode = camp_res.data.get("strategy_mode", "territory") if camp_res.data else "territory"
                    self.log(f"🎯 Modo de Estratégia (DB): {self.strategy_mode.upper()}", "System", "info")
                except Exception as e:
                    self.log(f"Erro ao buscar strategy_mode: {e}. Usando 'territory'.", "System", "warning")
                    self.strategy_mode = "territory"


        except Exception as e:
            self.log(f"Erro ao inicializar: {e}", "System", "error")
            raise ValueError(f"Erro ao inicializar persona: {e}")
    
    def log(self, message: str, agent_name: str = None, status: str = "info", agent: str = None, 
            event_type: str = "system", task_name: str = None, tool_name: str = None, payload: dict = None):
        """
        Registra um log em tempo real no banco de dados para telemetria.
        
        Args:
            message: Mensagem do log
            agent_name: Nome do agente (Analista, Estrategista, Planejador, System)
            agent: Alias para agent_name (compatibilidade com _log_step)
            status: 'info', 'success', 'error', 'warning'
            event_type: 'system', 'task_start', 'task_end', 'tool_start', 'tool_end', 'ai_thought', 'error'
            task_name: Nome da tarefa (opcional)
            tool_name: Nome da ferramenta (opcional)
            payload: Dados estruturados adicionais (JSON)
        """
        # Aceita tanto 'agent' quanto 'agent_name' como argumento
        final_agent = agent or agent_name or "System"
        
        try:
            print(f"[{final_agent}] {message}")  # Console local também
            
            # 1. Log legado (agent_logs)
            if self.run_id:
                self.supabase.table("agent_logs").insert({
                    "run_id": self.run_id,
                    "campaign_id": self.campaign_id,
                    "agent_name": final_agent,
                    "message": message,
                    "status": status
                }).execute()

                # 2. Novo Log estruturado (crew_run_logs) para Console Master
                self.supabase.table("crew_run_logs").insert({
                    "run_id": self.run_id,
                    "campaign_id": self.campaign_id,
                    "event_type": event_type,
                    "agent_name": final_agent,
                    "task_name": task_name,
                    "tool_name": tool_name,
                    "message": message,
                    "payload": payload or {}
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
        if "deepseek" in model_name:
            api_key = os.getenv("DEEPSEEK_API_KEY")
            clean_model = model_name.replace("deepseek/", "") if "deepseek/" in model_name else model_name
            
            # AUDIT LOG (Secure)
            key_preview = f"{api_key[:6]}... ({len(api_key)} chars)" if api_key else "NONE"
            print(f"[AUDIT] Creating LLM: provider=deepseek_direct model={clean_model}")
            print(f"[AUDIT] Key Check: {key_preview}")
            
            # Instancia o Adapter Manual (Bypass LangChain)
            llm = DeepSeekLLM(
                api_key=api_key,
                model_name=clean_model,
                temperature=temperature
            )
            
            # Real Validation
            try:
                print(f"[System] 🩺 Verificando conexao DeepSeek ({clean_model}) via HTTP Direto...")
                status = llm.invoke("Responda apenas 'OK'.")
                content = status.content if hasattr(status, 'content') else str(status)
                print(f"[System] ✅ DeepSeek Online. Resposta: {content[:20]}")
                return llm
            except Exception as e:
                print(f"[System] ❌ Falha na validacao DeepSeek: {e}")
                raise ValueError(f"DeepSeek Connection Failed: {e}")

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
        print(f"[create_llm] Fallback to ChatOpenAI for {model_name}")
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

    def _log_task_finish(self, task_output: Any):
        """
        🎙️ Captura a conclusão de uma tarefa
        """
        try:
            # O output pode ser uma string ou um objeto TaskOutput
            output_str = str(task_output)
            
            # Se for um objeto TaskOutput, tenta pegar o raw
            if hasattr(task_output, 'raw'):
                output_str = task_output.raw
            
            # Identifica qual tarefa terminou (heurística básica por conteúdo ou apenas log genérico)
            # O ideal seria ter o nome da tarefa, mas o callback do CrewAI passa apenas o output.
            
            # Trunca para o log não ficar gigante, mas suficiente para leitura
            preview = output_str[:500] + "..." if len(output_str) > 500 else output_str
            
            self.log(f"🏁 Tarefa Concluída! Resultado:\n{preview}", agent="System", status="success", event_type="task_end", payload={"full_output": output_str})
            
        except Exception as e:
            print(f"⚠️ Erro ao logar fim da tarefa: {e}")

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
                # needs_tools = agent_id in ["analyst", "researcher"]
                tools = [] # [campaign_vector_search, campaign_stats] if needs_tools else []
                
                agent = Agent(
                    role=agent_config.get("role", f"Agente {agent_id}"),
                    goal=agent_config.get("goal", "Contribuir para a campanha"),
                    backstory=agent_config.get("backstory", "Membro experiente da equipe."),
                    tools=tools,
                    llm=self.llm,
                    function_calling_llm=self.llm, # Força uso do DeepSeek, evita fallback da CrewAI
                    verbose=True,
                    allow_delegation=False,
                    max_iter=max_iter,
                    step_callback=None # Evita interferência de callbacks complexos
                )
                created_agents[agent_id] = agent
                print(f"[DEBUG] Created agent {agent_id} with LLM type: {type(self.llm)}")
                if hasattr(self.llm, 'model_name'):
                    print(f"       Model: {self.llm.model_name}")
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
                function_calling_llm=self.llm,
                verbose=True,
                allow_delegation=False,
                max_iter=max_iter,
                step_callback=None
            )
            print(f"[DEBUG] Created analyst with LLM type: {type(self.llm)}")
            
            created_agents["strategist"] = Agent(
                role=self.personas.get("strategist", {}).get("role", "Estrategista"),
                goal=self.personas.get("strategist", {}).get("goal", "Definir estratégia"),
                backstory=self.personas.get("strategist", {}).get("backstory", "Consultor experiente."),
                llm=self.llm,
                function_calling_llm=self.llm,
                verbose=True,
                allow_delegation=False,
                max_iter=max_iter,
                step_callback=None
            )
            
            created_agents["planner"] = Agent(
                role=self.personas.get("planner", {}).get("role", "Planejador"),
                goal=self.personas.get("planner", {}).get("goal", "Criar planos táticos"),
                backstory=self.personas.get("planner", {}).get("backstory", "Gerente de projeto."),
                llm=self.llm,
                function_calling_llm=self.llm,
                verbose=True,
                allow_delegation=False,
                max_iter=max_iter,
                step_callback=None
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
        
        # ===== LÓGICA DE MODOS DE ESTRATÉGIA (Arquétipos) =====
        mode = getattr(self, "strategy_mode", "territory") # Default safe
        
        mode_instructions = {
            "territory": """
            🎯 FOCO ESTRATÉGICO: TERRITÓRIO (MAJORITÁRIO / LOCAL)
            - Sua prioridade é a GEOGRAFIA e a ZELADORIA.
            - Foque em problemas visíveis (buracos, iluminação, postos de saúde).
            - Sugira ações de presença física: caminhadas, reuniões de bairro, café com vizinhos.
            - O objetivo é "conquistar quarteirões". A lógica é de Prefeito ou Vereador comunitário.
            """,
            "ideological": """
            🎯 FOCO ESTRATÉGICO: CAUSA & OPINIÃO (PROPORCIONAL / IDEOLÓGICO)
            - Sua prioridade é a MENSAGEM e a MOBILIZAÇÃO DIGITAL.
            - Foque em valores, defesa de bandeiras (ex: segurança, família, meio ambiente) e polêmicas estratégicas.
            - Sugira ações de mídia: lives, cortes virais, artigos de opinião, pressão em votações.
            - O mapa não é geográfico, é temático. Onde estão as pessoas que pensam assim?
            """,
            "structural": """
            🎯 FOCO ESTRATÉGICO: ESTRUTURA & CORPORATIVO (PROPORCIONAL / BASE)
            - Sua prioridade são as RELAÇÕES e as INSTITUIÇÕES.
            - Foque em categorias profissionais (médicos, policiais, professores) e lideranças regionais.
            - Sugira ações de bastidor: reuniões com sindicatos, apoio a eventos de associações, emendas parlamentares.
            - A lógica é de "representante da classe" ou "padrinho da região".
            """
        }
        
        current_instruction = mode_instructions.get(mode, mode_instructions["territory"])
        
        task1 = Task(
            description=f"""
            Analise PROFUNDAMENTE a campanha {self.campaign_id}.
            
            Passos:
            1. TENTE usar a ferramenta campaign_stats para entender os dados eleitorais.
            2. TENTE usar campaign_vector_search para ler o Plano de Governo.
            
            ⚠️ IMPORTANTE: Se as ferramentas não retornarem dados ou falharem (devido a erro de conexão ou ausência de arquivos), NÃO PARE.
            Em vez disso, use seu CONHECIMENTO PRÉVIO sobre campanhas políticas para inferir um cenário provável para um candidato deste perfil ({self.strategy_mode}).
            Assuma que é uma campanha competitiva e gere insights baseados em boas práticas políticas.

            3. Identifique:
               - 5 PONTOS FORTES (dados, propostas, histórico)
               - 5 PONTOS FRACOS (lacunas, vulnerabilidades)
               - 5 OPORTUNIDADES (contexto político, demandas não atendidas)
            
            {current_instruction}

            Formato de saída: Relatório estruturado em tópicos com justificativa para cada item.
            IMPORTANTE: Utilize um tom {self.tone} na sua análise.
            """,
            agent=analyst,
            expected_output="Relatório detalhado com pontos fortes, fracos e oportunidades"
        )
        
        task2 = Task(
            description=f"""
            Baseado no relatório do Analista, defina OS 3 PILARES ESTRATÉGICOS da campanha.
            
            {current_instruction}

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
            Crie UMA LISTA NUMERADA com EXATAMENTE {self.task_count} SUGESTÕES TÁTICAS CONCRETAS baseadas nos 3 pilares estratégicos.
            
            {current_instruction}

            EXTREMAMENTE IMPORTANTE:
            1. Você DEVE gerar {self.task_count} itens. Nem menos, nem mais.
            2. Numere de 1 a {self.task_count}.
            
            Cada sugestão deve:
            - Estar vinculada a um dos 3 pilares
            - Ser uma ação específica e executável
            - Ter objetivo claro e mensurável
            - Indicar a fase da campanha (pre_campaign, campaign, final_sprint)
            
            {examples_instruction}
            
            Formato de saída esperado para cada item:
            "N. [Título da Tática]
            Descrição completa...
            Ex: [Exemplo 1]
            Ex: [Exemplo 2]..."
            
            Formato final: Lista de estratégias detalhadas.
            IMPORTANTE: Escreva todas as táticas com um tom {self.tone}.
            """,
            agent=planner,
            expected_output=f"Lista numerada contendo EXATAMENTE {self.task_count} táticas, cada uma com {self.num_examples} exemplos 'Ex:'",
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
            IMPORTANTE: Mantenha TODO o texto no tom {self.tone}.
            Seja conciso mas completo. Máximo 2000 palavras.
            """,
            agent=strategist,
            expected_output="Documento Markdown completo do plano estratégico",
            context=[task1, task2, task3]
        )
        
        # Task final que combina tudo
        task5 = Task(
            description=f"""
            Você está no passo final de uma Genesis Crew política. Sua tarefa é gerar a saída final em JSON contendo APENAS a lista de estratégias.
            
            VOCÊ PRECISA INCLUIR EXATAMENTE {self.task_count} ESTRATÉGIAS NO ARRAY 'strategies'.
            Conte cuidadosamente. Se houver {self.task_count} no texto acima, todas devem estar no JSON.

            Format Output:
            {{
              "strategies": [
                {{
                  "title": "título da tática",
                  "description": "descrição da tática (IMPORTANTE: REMOVA as linhas de 'Ex:' daqui)",
                  "pillar": "nome do pilar estratégico",
                  "phase": "fase da campanha (ex: pre_campaign, campaign, final_sprint)",
                  "examples": ["Exemplo 1", "Exemplo 2"]
                }},
                ...
              ]
            }}

            Regras estritas:
            1. O campo `strategies` é uma lista de objetos JSON.
            2. NÃO inclua o 'strategic_plan' (será adicionado via código).
            3. COPIE O TEXTO DA DESCRIÇÃO mas REMOVA as linhas que começam com "Ex:".
            4. MOVA os textos dos "Ex:" para o array `examples`.
            5. Garanta que o JSON seja válido (escape aspas duplas dentro de strings, etc).
            6. Nunca omita a vírgula entre campos no JSON.
            
            Verificação Final Obrigatória:
            - O array `strategies` tem {self.task_count} itens? Se não, corrija agora.
            - O JSON contém APENAS a chave "strategies"?
            
            Agora, gere o JSON.
            """,
            agent=planner,
            expected_output=f"Um BLOCO JSON raw contendo array 'strategies' com {self.task_count} itens. NÃO USE MARKDOWN.",
            context=[task1, task2, task3, task4],
            # output_json=StrategiesList  <-- REMOVIDO: Causa erro de validação com DeepSeek
            # Vamos usar parsing manual robusto no método run()
        )
        
        # Monta a lista de tarefas base
        tasks = [task1, task2, task3, task4, task5]
        
        # === TAREFAS EXTRAS PARA TEMPLATES MAIORES ===
        
        
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

        # ------------------------------------------------------------------
        # DEMO ENTERPRISE AGENTS (Novos Agentes do Sistema Enterprise)
        # ------------------------------------------------------------------

        # Tarefa do Policy Modeler (se existir)
        if "policy-modeler" in agents:
            task_policy = Task(
                description="""
                Analise os 3 pilares estratégicos sob a ótica de POLÍTICAS PÚBLICAS REAIS.
                
                Para cada pilar:
                1. Estime o IMPACTO CAUSAL (Quem ganha? Quem perde?).
                2. Identifique possíveis efeitos colaterais negativos.
                3. Sugira uma métrica de sucesso concreta (KPI).
                
                O objetivo é garantir que a promessa de campanha seja tecnicamente viável.
                """,
                agent=agents["policy-modeler"],
                expected_output="Análise de viabilidade e impacto das políticas propostas",
                context=[task2]
            )
            # Insere logo após os pilares (antes das táticas)
            tasks.insert(2, task_policy)
        
        # Tarefa do Compliance Agent (se existir)
        if "compliance-agent" in agents:
            task_compliance = Task(
                description="""
                AUDITORIA FINAL DE COMPLIANCE. 
                
                Verifique todo o plano estratégico e as táticas geradas quanto a:
                1. Discurso de Ódio ou Preconceito (Zero Tolerance).
                2. Promessas ilegais ou inconstitucionais.
                3. Risco de reputação grave.
                
                Se encontrar problemas, LISTE ELES DE FORMA CLARA. Se estiver tudo ok, valide o plano.
                """,
                agent=agents["compliance-agent"],
                expected_output="Relatório de Conformidade e Riscos Éticos/Legais",
                context=[task3, task4]
            )
            # Insere como PENÚLTIMA tarefa (antes de gerar o JSON final)
            tasks.insert(-1, task_compliance)

        # ------------------------------------------------------------------
        
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
            "task_callback": self._log_task_finish,
            "process": crew_process
        }
        
        # Se hierárquico, adiciona manager_llm (usa modelo configurado pelo admin)
        if self.process_type == "hierarchical":
            manager_llm = self._create_llm(self.manager_model, temperature=0.3)  # Baixa criatividade para manager
            print(f"[DEBUG] Manager LLM type: {type(manager_llm)}")
            crew_params["manager_llm"] = manager_llm
            self.log(f"🎩 Modo Hierárquico: Manager usando {self.manager_model}", "System", "info")
        
        crew = Crew(**crew_params)
        
        # AUDIT: Verifica o estado final dos Agentes antes de rodar
        print("\n[AUDIT] === PRE-KICKOFF AGENT INSPECTION ===")
        for ag in crew.agents:
            print(f"[AUDIT] Agent: {ag.role}")
            print(f"       LLM: {ag.llm} (type: {type(ag.llm)})")
            if hasattr(ag.llm, "model_name"):
                 print(f"       Model: {ag.llm.model_name}")
            print(f"       FuncLLM: {ag.function_calling_llm} (type: {type(ag.function_calling_llm)})")
        print("[AUDIT] ====================================\n")
        
        self.log("Equipe iniciada! Agentes começando a trabalhar...", "Analista", "info")
        result = crew.kickoff()
        
        # --- AGGREGATION PATTERN (Optimization) ---
        # Recupera o Plano Estratégico (Task 4) diretamente da memória da Task
        # Isso evita que o LLM tenha que gerar tudo de novo no JSON (Task 5)
        
        strategic_plan_text = ""
        # Procura a task que gerou o plano
        for task in tasks:
            # Identifica a task pelo output esperado (mais seguro que index fixo)
            if "Documento Markdown completo" in str(task.expected_output):
                if hasattr(task, 'output') and hasattr(task.output, 'raw'):
                    strategic_plan_text = task.output.raw
                    print(f"[Guardrail] 📄 Plano Estratégico recuperado da Task: {len(strategic_plan_text)} chars")
                    break
        
        # Se falhar em achar a task, tenta pegar do raw result se parecer markdown (fallback)
        if not strategic_plan_text:
             print("[Guardrail] ⚠️ Alerta: Não foi possivel recuperar o plano da Task 4. Usando fallback.")
        
        # --- JSON GUARDRAIL PARA ESTRATÉGIAS (Enterprise Enhanced) ---
        final_strategies = []
        raw_output_text = ""
        parsing_error = None
        
        # CAPTURE RAW OUTPUT FIRST (Always save regardless of parsing success)
        if hasattr(result, 'raw'):
            raw_output_text = result.raw
        elif isinstance(result, str):
            raw_output_text = result
        
        print(f"[Guardrail] 📦 Raw output captured: {len(raw_output_text)} chars")
        
        try:
            # 1. Happy Path: Pydantic (StrategiesList)
            if hasattr(result, 'pydantic') and result.pydantic:
                if hasattr(result.pydantic, 'strategies'):
                     final_strategies = [s.model_dump() for s in result.pydantic.strategies]
                     if hasattr(result.pydantic, 'strategic_plan') and not strategic_plan_text:
                         strategic_plan_text = result.pydantic.strategic_plan
                print(f"[Guardrail] ✅ Pydantic path: {len(final_strategies)} strategies")
            
            # 2. Path: JSON Dict
            elif hasattr(result, 'json_dict') and result.json_dict:
                if "strategies" in result.json_dict:
                    final_strategies = result.json_dict["strategies"]
                if "strategic_plan" in result.json_dict and not strategic_plan_text:
                    strategic_plan_text = result.json_dict["strategic_plan"]
                print(f"[Guardrail] ✅ JSON dict path: {len(final_strategies)} strategies")

            # 3. Path: Raw Text Parsing with NEW json_cleaner
            elif raw_output_text:
                print(f"[Guardrail] ⚠️ Using json_cleaner for raw text...")
                
                # TENTATIVA 0: Parse Direto (Crucial para evitar regex falho em JSON válido)
                try:
                    # Usa a função clean_json_output já existente no arquivo
                    cleaned_direct = clean_json_output(raw_output_text)
                    parsed_direct = json.loads(cleaned_direct)
                    
                    if isinstance(parsed_direct, dict) and "strategies" in parsed_direct:
                        final_strategies = parsed_direct["strategies"]
                        if "strategic_plan" in parsed_direct and not strategic_plan_text:
                            strategic_plan_text = parsed_direct["strategic_plan"]
                        print(f"[Guardrail] ✅ Direct JSON Load Success: {len(final_strategies)} strategies")
                except Exception as e_direct:
                    print(f"[Guardrail] Direct parse failed, trying heuristics: {e_direct}")

                if not final_strategies:
                    from src.utils.json_cleaner import extract_json_from_text, clean_for_display
                
                parsed, cleaned, error = extract_json_from_text(raw_output_text)
                
                if parsed is not None:
                    if isinstance(parsed, dict) and "strategies" in parsed:
                        final_strategies = parsed["strategies"]
                        if "strategic_plan" in parsed and not strategic_plan_text:
                            strategic_plan_text = parsed["strategic_plan"]
                    elif isinstance(parsed, list):
                        final_strategies = parsed
                    print(f"[Guardrail] ✅ json_cleaner recovered: {len(final_strategies)} strategies")
                else:
                    parsing_error = error
                    print(f"[Guardrail] ❌ json_cleaner failed: {error}")
                    
                    # Last resort: legacy regex recovery
                    recovered = recover_data_from_broken_json(raw_output_text)
                    final_strategies = recovered.get("strategies", [])
                    if recovered.get("strategic_plan") and not strategic_plan_text:
                        strategic_plan_text = recovered["strategic_plan"]
                    print(f"[Guardrail] 🔧 Regex recovery: {len(final_strategies)} strategies")

        except Exception as e:
            parsing_error = str(e)
            print(f"[Guardrail] ☠️ Erro ao processar estratégias: {e}")
            
        # VALIDAÇÃO FINAL + RAW OUTPUT SAVING
        if not strategic_plan_text:
            if raw_output_text:
                # Use raw output as fallback plan
                from src.utils.json_cleaner import clean_for_display
                strategic_plan_text = f"# Análise Gerada (Formato Raw)\n\n{clean_for_display(raw_output_text, 5000)}"
            else:
                strategic_plan_text = "# Erro na Geração do Plano\n\nNão foi possível recuperar o texto do plano estratégico."
        
        # Return with partial success info
        return {
            "strategic_plan": strategic_plan_text,
            "strategies": final_strategies,
            "raw_output": raw_output_text,
            "parsing_error": parsing_error,
            "partial_success": bool(parsing_error and (strategic_plan_text or final_strategies))
        }


    def _normalize_output(self, data: Dict) -> Dict:
        """Normaliza dict de saída para o formato esperado"""
        return {
            'strategic_plan': data.get('strategic_plan', "# Plano Estratégico\n\nDados estruturados não encontrados."),
            'strategies': data.get('strategies', []) if isinstance(data.get('strategies'), list) else []
        }
    
    def save_to_database(self, result: dict):
        """
        Salva o resultado da execução no banco de dados com versionamento.
        
        Fluxo:
        1. Cria um registro em 'analysis_runs' (versão da análise)
        2. Salva estratégias vinculadas ao 'run_id'
        3. Atualiza o plano na campanha (campo legado)
        """
        import logging
        logger = logging.getLogger(__name__)
        
        supabase = get_supabase_client()
        
        strategic_plan = result.get('strategic_plan', '')
        strategies = result.get('strategies', [])
        raw_output = result.get('raw_output', '')
        parsing_error = result.get('parsing_error', None)
        partial_success = result.get('partial_success', False)
        
        # Log dos dados recebidos para debug
        self.log(f"📊 Dados: plano={len(strategic_plan)} chars, estratégias={len(strategies)}, raw={len(raw_output)} chars", "System", "info")
        if partial_success:
            self.log(f"⚠️ Sucesso parcial: {parsing_error}", "System", "warning")
        
        # Validar dados antes de salvar
        if not strategic_plan:
            self.log("⚠️ Plano estratégico vazio ou ausente", "System", "warning")
            logger.warning(f"[save_to_database] Plano estratégico vazio para campanha {self.campaign_id}")
        
        if not strategies:
            self.log("⚠️ Nenhuma estratégia gerada para salvar", "System", "warning")
            logger.warning(f"[save_to_database] Lista de estratégias vazia para campanha {self.campaign_id}")
        
        # 1. Atualizar registro de execução existente (criado pela API genesis)
        run_id = self.run_id
        try:
            if run_id:
                # Atualiza o run existente com o plano
                supabase.table("analysis_runs").update({
                    "strategic_plan_text": strategic_plan,
                    "status": "completed"
                }).eq("id", run_id).execute()
                self.log(f"📦 Run #{run_id[:8]}... atualizado", "System", "info")
            else:
                # Fallback: cria novo registro se não houver run_id
                run_result = supabase.table("analysis_runs").insert({
                    "campaign_id": self.campaign_id,
                    "persona_name": self.persona,
                    "llm_model": self.llm.model_name if hasattr(self.llm, 'model_name') else "unknown",
                    "strategic_plan_text": strategic_plan,
                    "status": "completed"
                }).execute()
                run_id = run_result.data[0]["id"]
                self.log(f"📦 Novo Run #{run_id[:8]}... criado (fallback)", "System", "info")
        except Exception as e:
            error_msg = f"Erro ao criar/atualizar analysis_run: {e}"
            self.log(f"❌ {error_msg}", "System", "error")
            logger.error(f"[save_to_database] {error_msg}")
            raise e
        
        # 2. Salvar o plano estratégico na campanha (campo legado - mantém compatibilidade)
        try:
            supabase.table("campaigns").update({
                "ai_strategic_plan": strategic_plan
            }).eq("id", self.campaign_id).execute()
            
            self.log(f"📄 Plano atualizado na campanha", "System", "info")
        except Exception as e:
            self.log(f"⚠️ Erro ao salvar plano legado: {e}", "System", "warning")
            logger.warning(f"[save_to_database] Erro ao salvar plano legado: {e}")
        
        # 3. Salvar as táticas vinculadas à run
        if not strategies:
            self.log("ℹ️ Nenhuma estratégia para salvar, finalizando", "System", "info")
            return {"run_id": run_id, "strategies_saved": 0}
        
        # Mapeamento de fases para o enum do banco
        phase_map = {
            "pre_campaign": "diagnostico",
            "campaign": "campanha_rua",
            "final_sprint": "reta_final"
        }
        
        # Prepara os dados para inserção
        strategies_data = []
        for idx, suggestion in enumerate(strategies):
            try:
                raw_phase = suggestion.get("phase", "campaign")
                db_phase = phase_map.get(raw_phase, "campanha_rua")
                
                title = suggestion.get("title", "")
                if not title:
                    self.log(f"⚠️ Estratégia #{idx+1} sem título, ignorando", "System", "warning")
                    continue
                
                strategies_data.append({
                    "campaign_id": self.campaign_id,
                    "run_id": run_id,  # Vínculo com a versão
                    "title": title,
                    "description": suggestion.get("description", ""),
                    "pillar": suggestion.get("pillar", ""),
                    "phase": db_phase,
                    "status": "suggested",
                    "examples": suggestion.get("examples", []) or parse_examples(suggestion.get("description", "")).get("examples", [])
                })
            except Exception as parse_error:
                error_msg = f"Erro ao processar estratégia #{idx+1}: {parse_error}"
                self.log(f"❌ {error_msg}", "System", "error")
                logger.error(f"[save_to_database] {error_msg} | Dados: {suggestion}")
        
        if not strategies_data:
            self.log("⚠️ Nenhuma estratégia válida após parsing", "System", "warning")
            return {"run_id": run_id, "strategies_saved": 0}
        
        # Insere no banco
        try:
            result = supabase.table("strategies").insert(strategies_data).execute()
            self.log(f"✅ {len(strategies_data)} estratégias salvas (run: {run_id[:8]}...)", "System", "success")
            return {"run_id": run_id, "strategies_saved": len(strategies_data)}
        except Exception as insert_error:
            error_msg = f"Erro ao inserir estratégias no banco: {insert_error}"
            self.log(f"❌ {error_msg}", "System", "error")
            logger.error(f"[save_to_database] {error_msg}")
            raise insert_error
    
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
