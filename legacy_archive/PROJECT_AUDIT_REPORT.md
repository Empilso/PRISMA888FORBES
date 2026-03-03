# PROJECT AUDIT REPORT (AS-IS)
**Data:** 15/01/2026
**Projeto:** PRISMA 888 / SHEEPSTACK
**Escopo:** Backend (CrewAI/FastAPI) e Frontend (Next.js) - Foco no módulo "Radar de Promessas"

---

## 1. Visão Geral da Arquitetura

O sistema opera em uma arquitetura **Híbrida Event-Driven** com polling no frontend, orquestrando agentes de IA para processamento assíncrono.

### Stack Tecnológica
- **Frontend:** Next.js 15.3.6 (App Router), React 19, TailwindCSS, Phosphor Icons.
- **Backend API:** FastAPI (Python), rodando em modo assíncrono.
- **AI & Agents:** CrewAI (Framework), DeepSeek (LLM Principal), Tavily (Search Tool).
- **Banco de Dados:** Supabase (PostgreSQL + RLS).
- **Infraestrutura AI:** Monkey Patch customizado para forçar chamadas DeepSeek via HTTP direto.

### Fluxo de Dados (Radar Phase 3)
1.  **User Action:** Usuário clica em "Iniciar Varredura" no `Phase3Orchestrator.tsx`.
2.  **API Request:** POST `/api/campaigns/{id}/radar/{mandate_id}/phase3` é enviado ao backend.
3.  **Async Processing:** O endpoint responde imediatamente (`202 Accepted`) e despacha uma `BackgroundTask` (`_run_phase3_background`).
4.  **Agent Execution:**
    -   `RadarCrew` é instanciado.
    -   `radar-google-scanner` (Agente) usa `TavilySearchTool` para buscar na web.
    -   O resultado é validado via Pydantic (`MediaScanResult`).
5.  **Persistência:**
    -   Logs de "pensamento" do agente são salvos em `agent_logs`.
    -   O resultado final (JSON estruturado) e status são salvos em `radar_executions`.
6.  **Frontend Update:** O `Phase3Orchestrator` faz polling em `/api/mandates/{id}/phase-status` a cada 3s para recuperar logs e o resultado final.

---

## 2. Mapa de Arquivos & Funcionalidades

### Backend (`backend/src`)

#### `main.py` (Core & Patches)
-   **Monkey Patch Implacável:** Contém um patch crítico ("Nuclear Option") que intercepta chamadas do `litellm` e `openai` para redirecionar requisições de modelos "deepseek" ou "custom-proxy-chat" diretamente para a API HTTP da DeepSeek. Isso contorna limitações do CrewAI/LiteLLM.
-   **Router Central:** Agrega todos os sub-roteadores (`radar_premium`, `campaign`, etc.).

#### `crew/radar_crew.py` (Lógica de Agentes)
-   **Estrutura:** Classe `RadarCrew` gerencia a execução dos agentes.
-   **TavilySearchTool:** Implementação customizada herdando de `crewai.tools.BaseTool`. Usa o client oficial `tavily` para `search_depth="advanced"`.
-   **Pydantic Models:** Define `MediaScanResult` e `MediaItem` para garantir que o LLM retorne JSON estrito.
-   **Logging:** Método `_log_step` captura callbacks do CrewAI (`thought`, `tool`, `result`) e insere na tabela `agent_logs`.
-   **LLM Factory:** Método `_create_llm` aplica configurações específicas para DeepSeek (`base_url`, `api_key`).

#### `api/radar_premium.py` (Controller)
-   **Endpoints de Fases:**
    -   `POST .../phase1`: Extração de PDF (fire-and-forget).
    -   `POST .../phase2`: Cruzamento de dados fiscais (`RadarMatcher`).
    -   `POST .../phase3`: Varredura de Mídia (`_run_phase3_background`).
-   **Gestão de Mandatos:** CRUD de mandatos, vinculando `politician_id`, `office_id`, `city_id`.
-   **Background Tasks:** Funções `_extract_promises_background`, `_process_phase2_background`, `_run_phase3_background` isolam a lógica pesada da thread principal.

### Frontend (`frontend/src`)

#### `components/campaign/Phase3Orchestrator.tsx` (UI)
-   **State Machine:** Gerencia estados visuais: `idle` (config), `running` (loading + logs), `completed` (resultados), `error`.
-   **Polling Inteligente:** Consulta `/phase-status` e atualiza logs em tempo real (`ScanProgress`).
-   **Renderização:** Exibe resultados usando componente `MediaResults`. Trata variações de resposta do backend (array direto vs objeto envelopado).
-   **Configuração Dinâmica:** Busca lista de agentes de varredura no endpoint `/api/agents`.

---

## 3. Configuração dos Agentes

### Agentes Identificados (Código)
1.  **`radar-extrator-promessas`**:
    -   **Função:** Extrair promessas de PDFs de Planos de Governo.
    -   **Trigger:** Phase 1.
2.  **`radar-fiscal-verbas`**:
    -   **Função:** Cruzar promessas com execução orçamentária.
    -   **Trigger:** Phase 2.
3.  **`radar-google-scanner`**:
    -   **Função:** Investigação de mídia e notícias online.
    -   **Trigger:** Phase 3.
    -   **Tools:** `Busca na Web (Tavily)`.

### Ferramentas (Tools)
-   **TavilySearchTool**: Busca avançada (limitada a 5 resultados por chamada interna, mas o parametro do frontend `max_results` tenta controlar o total compilado).
-   **DeepSeek LLM**: Usado como cérebro para todas as operações.

### Variáveis de Ambiente (Críticas)
-   `DEEPSEEK_API_KEY`: Essencial para o Monkey Patch.
-   `TAVILY_API_KEY`: Usada na `TavilySearchTool`.
-   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: Acesso ao banco.

---

## 4. Banco de Dados (Supabase)

Tabelas principais referenciadas no código auditado:

-   **`mandates`**: Tabela central que une Político, Cargo e Cidade.
-   **`radar_executions`**: Histórico de execuções (status, logs, summaries). Chave para o polling do frontend.
-   **`agent_logs`**: Logs granulares (pensamentos) dos agentes em tempo real.
-   **`agents`**: Configurações (persona, role, goal) dos agentes.
-   **`personas`**: Tabela legada usada como fallback se o agente não estiver na tabela `agents`.
-   **`promises`**: Armazena as promessas extraídas.
-   **`documents`**: Fonte dos PDFs para extração.

---

## 5. Pendências e Pontos de Atenção

1.  **⚠️ Monkey Patch Frágil (`main.py`)**:
    -   A injeção de código no `litellm` e `openai` é uma solução "de guerra". Atualizações nessas bibliotecas podem quebrar o backend silenciosamente.
    -   *Recomendação:* Monitorar versões ou migrar para implementação nativa de provider assim que o CrewAI suportar melhor o DeepSeek.

2.  **⚠️ Hardcoding de Município (`radar_premium.py`)**:
    -   Linha 670: `municipio_slug = "votorantim"`. Se o `city_slug` falhar, ele força "votorantim". Isso pode gerar dados falsos para outros municípios se não houver tratamento de erro adequado.

3.  **⚠️ Parsing de JSON (`radar_crew.py`)**:
    -   O método `run_extraction` (Fase 1) ainda faz parse manual de string (`raw.split("```json")`). Ideal seria migrar para `output_pydantic` como feito na Fase 3.

4.  **Integração de Logs**:
    -   O frontend depende fortemente de logs em `agent_logs` para feedback visual. Se o `step_callback` do CrewAI falhar, a UI fica "travada" visualmente, embora o background possa estar rodando.
