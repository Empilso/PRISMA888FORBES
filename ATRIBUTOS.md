# Atributos Técnicos e Definições (PRISMA 888)

## 📡 API (FastAPI)
- **Entrypoint**: `backend/src/main.py`.
- **Mecanismo de IA**: Monkey Patch Nuclear para DeepSeek (intercepta LiteLLM).
- **Formatos**: Outputs integrados via Pydantic para garantia de JSON estrito.

### Endpoints Principais
- `/api/campaign`: Gestão de tenants/campanhas.
- `/api/tse/candidates`: Listagem com auto-healing.
- `/api/radar`: Fases 1 (PDF), 2 (Fiscal), 3 (Mídia/Mundo).
- `/api/genesis/sync`: Orquestração estratégica global.

## 🗄️ Banco de Dados (Supabase/Postgres)
O projeto utiliza um "split schema" entre Prisma e Migrations manuais.

### Tabelas Críticas
| Tabela | Função | Segurança |
| :--- | :--- | :--- |
| `profiles` | Perfil estendido (CPF, Role, Terms) | RLS: Owner + Admin |
| `tasks` | Prioridades geradas pela IA | RLS: Authenticated Only |
| `ai_execution_logs` | Trace ID + Pensamento da IA | Realtime habilitado |
| `municipal_expenses` | Dados TCESP (Radar Phase 2) | Escrita via Service Role |

## 🤖 IA & Orquestração (CrewAI)
- **Framework**: CrewAI 1.8+.
- **Providers**: DeepSeek-V3/R1 via OpenRouter ou Direto.
- **Tools Customizadas**: 
  - `TavilySearchTool`: Busca web avançada.
  - `MunicipalSpendTool`: Crawler de gastos públicos.
  - `CampaignVectorSearch`: Busca semântica em Planos de Governo.

## 🛡️ Protocolos de Segurança
- **Multi-Tenant**: Filtragem obrigatória por `campaign_id` em todos os níveis.
- **Middleware**: Bloqueio de acesso anônimo a rotas `/admin` e `/campaign`.
- **Rate Limit**: Proteção básica de endpoints de IA.
