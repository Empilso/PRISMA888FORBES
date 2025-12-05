# SHEEPSTACK TECHNICAL MANIFESTO (GOLD STANDARD)

## 1. INFRAESTRUTURA & ORQUESTRAÇÃO (O Coração)
**Kestra (The Orchestrator)**: A fonte da verdade para qualquer processo que leve mais de 1 segundo.
- **Regra de Ouro**: Se tem retry, agendamento ou dependência, é um Flow do Kestra.
- **Docker & Dev Containers**: O ambiente deve ser reproduzível. O projeto deve rodar com um simples `docker compose up`.

## 2. BACKEND & AI CORE (O Cérebro)
**Python 3.12+ com uv**: Abandonamos o pip. Usamos `uv` para gerenciamento de pacotes (velocidade Rust).
- **Framework**: FastAPI (Assíncrono por padrão).
- **AI Frameworks**:
    - **LangGraph**: Para arquitetura de estado e loops cognitivos complexos.
    - **CrewAI**: Para orquestração de personas e times de agentes.
- **Observabilidade (O Pulo do Gato)**: Todo Agente DEVE ter tracing configurado (OpenTelemetry). Precisamos ver o "Chain of Thought" no console ou painel de monitoramento.

## 3. DADOS & MEMÓRIA (O Cofre)
**Supabase (PostgreSQL)**: O banco universal.
- **GraphRAG Ready**: Não usamos apenas busca vetorial (`pgvector`). Modelamos os dados para permitir RAG baseada em grafos (relacionamentos entre entidades).
- **Migrations**: Versionamento de banco é obrigatório (Alembic ou Supabase CLI).

## 4. FRONTEND & INTEGRAÇÃO (A Face)
**Type Safety Absoluta**:
- O Backend gera o `openapi.json` automaticamente.
- O Frontend usa geradores (como Orval ou TanStack Query) para criar os hooks de consumo baseados nesse JSON.
- **Resultado**: Se eu mudo o Python, o TypeScript avisa que quebrou no build time. Zero surpresas em produção.

## 5. SEGURANÇA & SECRETS (Vault Standard)
**Secrets Management:**
- **PROIBIDO:** `.env` solto em produção
- **OBRIGATÓRIO:** Secret Managers (AWS Secrets Manager, HashiCorp Vault, ou Doppler)
- **Rotação:** Secrets devem ser rotacionáveis sem redeploy
- **Desenvolvimento:** `.env` local apenas para dev, nunca commitado

**Implementação:**
- `infrastructure/secrets/` com integração para Secret Managers
- Kestra usa `{{ secret('KEY') }}` (nunca hardcode)
- Backend usa bibliotecas de secrets (boto3, hvac)
- Frontend: Secrets expostos via API (nunca no bundle)
