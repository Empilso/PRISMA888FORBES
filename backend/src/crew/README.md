# CrewAI System

## Objetivo
Sistema multi-agente para análise política usando CrewAI + DeepSeek.

## Agentes
- **Campaign Analyst**: Analisa dados eleitorais (SWOT)
- **Senior Strategist**: Define pilares estratégicos
- **Counter Intel**: Analisa rivais e gera relatórios de colisão
- **Creative Director**: Gera conteúdo de campanha (Roadmap futuro)

## Como adicionar novo agente
1. Criar em `src/crews/agents/[nome_agente].py` (ou definir configuração no banco `public.agents`)
2. Definir goal, backstory, tools
3. Adicionar em `src/crew/genesis_crew.py` (método `_create_agents`)

## Logging e Observabilidade
- **Callbacks**: Salvam em Supabase na tabela `ai_execution_logs`
- **Real-time**: Streaming via Supabase Realtime para o frontend (`TraceLogViewer.tsx`)
- **Trace ID**: Único por execução, agrupa todos os steps

## Arquivos principais
- `genesis_crew.py`: Orquestrador principal (Enterprise Class)
- `tools.py`: Ferramentas customizadas (Vector Search, Stats)
- `agents.py`: Definições legadas (migrando para DB-driven)
