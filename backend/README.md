# SheepStack Backend

Backend da plataforma SheepStack v3.0 - Sistema de gestão de campanhas políticas multi-tenant.

## Stack
- **Python:** 3.12+
- **Framework:** FastAPI (Async)
- **Database:** PostgreSQL (Supabase) com RLS
- **AI:** LangGraph + CrewAI
- **Observability:** OpenTelemetry

## Setup

```bash
# Instalar dependências
uv sync

# Rodar servidor de desenvolvimento
uv run fastapi dev src/main.py
```

## Estrutura
```
src/
├── core/       # Configurações e middlewares
├── api/        # Routers FastAPI
├── agents/     # LangGraph agents
├── services/   # Lógica de negócio
└── plugins/    # Plugins dinâmicos
```
