# CONSTITUIÇÃO DE DESENVOLVIMENTO PRISMA 888

## 1. STACK TECNOLÓGICO (HAWK STACK)
- **Backend:** Python 3.12+ (FastAPI) para APIs e Scripts.
- **Package Manager:** `uv` é obrigatório. Proibido usar pip ou poetry diretamente.
- **Orquestração:** Kestra (YAML) para cronjobs e fluxos de dados. NUNCA sugerir N8N/Zapier.
- **Banco de Dados:** PostgreSQL (Supabase). SEMPRE use `pgvector` para IA.
- **Frontend:** React + Vite + TypeScript + Shadcn/UI.
- **Motor de IA:** LangGraph para lógica complexa, CrewAI para personas.

## 2. PADRÕES DE CÓDIGO (POLÍTICA DE ZERO ERRO)
- **Tipagem Estrita:** Python DEVE usar Type Hints (`def func(a: int) -> str:`). TypeScript DEVE ser `strict: true`.
- **Sem "Magic Strings":** Use Enums ou Constantes para valores fixos.
- **Tratamento de Erros:** Scripts Python NUNCA devem quebrar silenciosamente. Use `try/except` com logs estruturados.
- **Modularidade:** Um arquivo = Uma classe/responsabilidade. Nada de arquivos "god object" com 1000 linhas.

## 3. SEGURANÇA DE BANCO DE DADOS (SUPABASE OBRIGATÓRIO)
- **RLS (Row Level Security):** É PROIBIDO criar uma tabela sem RLS ativado.
- **Auth:** As políticas devem usar `auth.uid()` para garantir o isolamento do tenant.
- **Migrations:** Nunca gere SQL solto. Gere arquivos de migração com timestamp (`20251126_create_users.sql`).

## 4. FLUXO DE TRABALHO
- **Planeje Primeiro:** Antes de escrever código complexo, apresente um mini-plano (lista de passos).
- **TDD:** Se a tarefa for crítica, escreva o teste (pytest/vitest) ANTES da implementação.

## 5. INTEGRAÇÃO FRONTEND (SCHEMA FIRST)
- **Proibido hardcode de chamadas de API no Frontend.** Use sempre clientes gerados via OpenAPI (Orval/TanStack Query).
