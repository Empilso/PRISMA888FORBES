# Arquitetura do Sistema

## Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: Python (FastAPI) + CrewAI + DeepSeek LLM
- **Database**: Supabase (Postgres + Auth + RLS + Vector)
- **Deploy**: Vercel (frontend) + Railway (backend)

## Decisões Técnicas
- **Supabase Auth**: Escolhido por segurança, compliance (SOC2) e facilidade de integração RLS.
- **CrewAI**: Framework multi-agente para orquestrar análises complexas que exigem planejamento e uso de ferramentas.
- **DeepSeek**: LLM de alta performance e custo reduzido, ideal para processamento massivo de dados políticos.
- **Supabase Realtime**: Para logs de IA "estilo hacker" com baixa latência.

## Fluxo de Dados
```mermaid
graph TD
    User[Admin User] -->|HTTPS| Next[Next.js Frontend]
    Next -->|Server Actions| Supabase[Supabase DB / Auth]
    Next -->|API Rest| Python[Backend API / CrewAI]
    Python -->|Logs (Realtime)| Supabase
    Supabase -->|Websocket| User
    Python -->|Inference| DeepSeek[DeepSeek API]
```

## Sistema de Auto-Gestão da IA

Cada módulo possui STATUS.md com duas funções:
1. **Documentação**: progresso, bugs, decisões
2. **Instruções Ativas**: regras que a IA DEVE seguir

### Workflow Obrigatório da IA
- **ANTES**: Ler STATUS.md do módulo
- **DURANTE**: Seguir regras específicas
- **DEPOIS**: Atualizar STATUS.md com progresso

### Enforcement
- A IA deve tratar STATUS.md como "contrato"
- Violações das regras = bug de processo
- Revisão semanal de STATUS.md para garantir atualização

