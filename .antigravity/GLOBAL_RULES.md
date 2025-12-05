# SHEEPSTACK CORE RULES (SEMPRE ATIVAS)

Estas regras estão SEMPRE na sua memória, independente do modo ativo:

## Stack Obrigatório
- **Backend:** Python 3.12+ (FastAPI)
- **Package Manager:** `uv` (NUNCA pip/poetry)
- **Orquestração:** Kestra (NUNCA N8N/Zapier)
- **Database:** Postgres (Supabase) com RLS obrigatório
- **Frontend:** React + Vite + TypeScript (strict)
- **AI:** LangGraph (complexo), CrewAI (personas)

## Zero Error Policy
- Python: Type Hints obrigatórios
- TypeScript: `strict: true`
- Sem "magic strings" (use Enums)
- Logs estruturados (nunca quebrar silenciosamente)

## Database Security
- RLS obrigatório em TODAS as tabelas
- Policies com `auth.uid()`
- Migrations versionadas (timestamp)

## Frontend Integration
- PROIBIDO hardcode de API calls
- OBRIGATÓRIO: Clientes gerados via OpenAPI

## Workflow
- Planeje antes de codar
- TDD para código crítico
