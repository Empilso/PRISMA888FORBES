# STATUS REPORT: PRISMA 888
**Data do Relatório:** 25/12/2025
**Auditor:** Agente AntiGravity (Google DeepMind)
**Versão:** 1.0 (Pós-Auditoria "Raio-X")

---

## 1. Visão Geral do Produto
O PRISMA 888 é uma plataforma robusta de inteligência política ("Big Data + IA") focada em estruturar campanhas, monitorar mandatos e gerar estratégias automatizadas.

**Módulos Principais:**
- **Dashboard de Campanha:** Visão central de métricas e acesso rápido. (Status: ✅ Operacional)
- **Mapa Interativo (ElectoralMap):** Visualização geoespacial de votos e performance por local de votação. Inclui camadas táticas. (Status: ✅ Enterprise - Funcional)
- **Radar Premium:** Sistema de extração de promessas via IA (PDF ingest) e cruzamento fiscal. (Status: ✅ Funcional - Com Mocks na Fase 3)
- **Genesis Crew (Agentes):** "Sala de Guerra" com múltiplos agentes (Analista, Estrategista, Planejador) gerando planos de campanha. (Status: ✅ Avançado)
- **Admin Geral:** Gestão de políticos, cidades, usuários e biblioteca de agentes. (Status: ✅ Operacional)

---

## 2. Estrutura do Repositório (Resumo)

### Backend (`/backend/src`)
- **API (`/api`):** Modularizada com FastAPI.
  - `agents.py`, `campaign.py`, `radar_premium.py`, `cities_politicians.py`: Core logic.
  - `ingestion.py`: Tratamento de arquivos PDF/CSV.
- **Crew (`/crew`):** Coração da IA.
  - `genesis_crew.py`: Orquestração complexa de agentes políticos.
  - `radar_crew.py`: Agentes específicos para auditoria de promessas e fiscalização.
  - `tools.py`: Ferramentas RAG (Vector Search) e Stats.
- **Engine/Workers:** Estruturas para processamento assíncrono (Kestra/Celery hooks).

### Frontend (`/frontend/src`)
- **App Router (`/app`):** Next.js 15.
  - `/admin`: Rotas administrativas (protegidas).
  - `/campaign/[id]`: Rotas do tenant/cliente final.
  - `/login`: Autenticação Supabase.
- **Components (`/components`):**
  - `/map`: Lógica complexa de mapas (Leaflet + Notes).
  - `/admin`: Visualizadores de Crew e tabelas.

---

## 3. Inventário de Rotas (Frontend)

| Rota | Status Aparente | Observação |
| :--- | :--- | :--- |
| `/login` | ✅ OK | Rota pública de entrada. |
| `/admin/dashboard` | ✅ OK | Hub central do administrador. |
| `/admin/politicos` | ✅ OK | CRUD completo com soft/hard delete e limpeza de email. |
| `/admin/agentes` | ✅ OK | Editor de personas e prompts. |
| `/admin/flows` | ⚠️ Parcial | Parece ser feature experimental de Kestra/N8N. |
| `/campaign/[id]/dashboard` | ✅ OK | Visão do Coordenador de Campanha. |
| `/campaign/[id]/map` | ✅ OK | **Crítico.** Carrega `ElectoralMapFull` (Leaflet). |
| `/campaign/[id]/promises` | ✅ OK | Interface do Radar Premium. |
| `/campaign/[id]/plan` | ✅ OK | Exibição do Plano Estratégico (Markdown/JSON). |
| `/campaign/[id]/tasks` | ✅ OK | Kanban de tarefas táticas. |

---

## 4. Inventário de Endpoints (Backend)

| Domínio | Arquivo Principal | Status | Dependências |
| :--- | :--- | :--- | :--- |
| **Agentes** | `agents.py` | ✅ Sólido | Tabela `agents`. CRUD completo. |
| **Campanha** | `campaign.py` | ✅ Sólido | `campaigns`, `campaign_settings`. |
| **Políticos/Cidades** | `cities_politicians.py` | ✅ Sólido | `politicians`, `cities`, `mandates`. Lógica complexa de slugs. |
| **Radar Premium** | `radar_premium.py` | ✅ Complexo | `radar_executions`, `promises`, `municipal_expenses`. Implementa fases 1, 2 e 3. |
| **Ingestão** | `ingestion.py` | ✅ Operacional | Integração com `document_chunks` e Supabase Storage. |
| **Map Notes** | `map_notes.py` | ✅ Operacional | Tabela `map_notes`. |

---

## 5. Banco de Dados (Supabase)
**Tabelas Ativas (Auditadas via API):**
- `politicians`, `cities`, `mandates`, `offices`: Core do domínio político.
- `campaigns`: Tenants do sistema.
- `agents`, `personas`: Configuração da IA.
- `radar_executions`, `promises`, `promise_budget_summaries`: Motor do Radar.
- `location_results`, `locations`: Dados para o Mapa Interativo.
- `municipal_expenses`: Dados financeiros (simplificados) para o Radar F2.
- `documents`, `document_chunks`: RAG.
- `ai_analysis_results`, `agent_logs`, `crew_run_logs`: Telemetria e output da IA.

---

## 6. Sistema de Agentes & Crews (Governança)
- **Admin:** Localizado em `/admin/agentes`. Salva JSONs na coluna `config` da tabela `personas`.
- **Execução (`genesis_crew.py`):**
  - Lê configuração dinâmica da tabela `personas`.
  - Suporta "Fallback" se a persona específica não existir.
  - **Riscos Identificados:**
    1. **Validação JSON:** Se o JSON no frontend for inválido, a Crew quebra no `__init__`.
    2. **Duplicidade:** Lógica de fallback pode mascarar erros de configuração (usa persona padrão silenciosamente).
    3. **Rate Limits:** `max_rpm=10` está hardcoded no código, pode ser gargalo em produção Enterprise.

---

## 7. Mapa Interativo (Produto Enterprise)
- **Tecnologia:** React Leaflet (via `next/dynamic` para SSR false).
- **Dados:** Cruza tabela `locations` (geometria/meta) com `location_results` (votos reais).
- **Funcionalidades Reais:**
  - Pins coloridos por performance (Vermelho/Amarelo/Verde).
  - Cálculo de "Share" (%) no frontend.
  - Sheet lateral ("Painel do Local") com ranking de votos.
  - "Ação de Guerrilha": Botão que chama API `/tactical_action` (feature avançada).
  - `MapNotesLayer`: Adição de notas/post-its no mapa.

---

## 8. Radar (Promessas) – Estado Atual
- **Fluxo:** Upload PDF Plano Governo -> OCR/Extract -> `RadarCrew` (IA) -> Tabela `promises`.
- **Status das Fases:**
  - **Fase 1 (Extração):** ✅ Real. Usa IA para ler PDF. Robustez contra PDFs vazios implementada.
  - **Fase 2 (Fiscal):** ✅ Real, mas com dados simplificados. Cruza promessas com `municipal_expenses` (tabela simples).
  - **Fase 3 (Mídia):** ⚠️ **Simulação (Mock).** O código em `radar_premium.py` gera notícias fake ("G1 Sorocaba", "Blog do Zé") para demonstração. Funcional para venda, mas não real.

---

## 9. CRUD Políticos e Exclusão Segura
- **Lógica de Delete (`delete_politician`):**
  - **Limpeza de Auth:** Renomeia e-mail do usuário vinculado (`deleted_{timestamp}_{email}`) para permitir re-cadastro.
  - **Cascata:** Remove explicitamente mandatos antes do político.
  - **Segurança:** Soft delete no Auth, Hard delete no Político (DB). Isso previne "email já existe" ao recriar.
  - **Botões:** Existem endpoints, UI admin parece conectada.

---

## 10. Build & Qualidade (Next.js 15)
- **Observações Estáticas:**
  - Uso correto de `use client` em componentes interativos.
  - Tipagem TypeScript parece consistente nos componentes críticos (`ElectoralMapFull`, `CrewVisualizer`).
  - **Alerta de Build:** Imports dinâmicos de mapas (`ssr: false`) estão corretos para Next.js 15.
  - **Vulnerabilidade Potencial:** Dependência `leaflet` e manipulação de DOM direto em mapas requerem cuidado com XSS se os dados de `locations` vierem de user input não sanitizado.

---

## 11. Onde Estamos -> Para Onde Vamos (Plano Seguro)

Com base no "Raio-X", o sistema está **muito mais maduro do que um MVP**, com features Enterprise (Mapa, Radar, Agentes) funcionais. O maior risco atual é a integridade dos dados de entrada (PDFs ruins, JSONs de agentes mal formados).

### Roadmap Recomendado (Próximos 5 Passos):

1.  **Blindagem do JSON de Agentes (Baixo Risco):**
    - Adicionar validação de Schema (Zod) no `POST /api/agents` e no Frontend antes de salvar. Evita que o Admin quebre a Crew.

2.  **Toggle "Modo Demo" no Radar (Médio Risco):**
    - Explicitar no UI quando a Fase 3 (Mídia) é simulação. Criar flag no backend para conectar API real de Google Search no futuro.

3.  **Refinar Ingestão de Dados do Mapa (Médio Risco):**
    - Criar script ou UI para upload de CSV de `locations` e `location_results` em lote. Hoje parece depender de seeding manual ou inserção via banco.

4.  **Logging Estruturado na UI (Baixo Risco):**
    - Conectar o `crew_run_logs` (já existente no DB) a um componente visual no Dashboard da Campanha para o usuário ver a IA "pensando" (hoje só admin vê ou via console).

5.  **Testes E2E Críticos (Alto Risco/Valor):**
    - Criar 1 teste Cypress/Playwright para o fluxo: Criar Campanha -> Upload PDF -> Gerar Plano. É o "Happy Path" que não pode quebrar.

---
**Conclusão:** O PRISMA 888 está pronto para demos de alto impacto. O código é limpo, modular e usa bem o Supabase como backend robusto.
