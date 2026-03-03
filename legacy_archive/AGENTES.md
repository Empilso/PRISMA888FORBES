# Biblioteca de Agentes Especialistas (PRISMA 888)

Definição dos agentes enterprise utilizados na orquestração de campanha.

## 👤 Agentes Implementados

### 1. Campaign Analyst (Analista de Campanha)
- **Role**: Especialista em análise geopolítica e estatística.
- **Goal**: Gerar diagnósticos SWOT baseados em dados do TSE e TCESP.
- **Tools**: `CampaignStatistics`, `CampaignVectorSearch`.

### 2. Senior Strategist (Estrategista Sênior)
- **Role**: Arquiteto de narrativas e contrapontos políticos.
- **Goal**: Definir pilares estratégicos e planos de ação prioritários.
- **Tools**: `TavilySearch`, `StrategicSearch`.

### 3. Creative Director (Diretor Criativo)
- **Role**: Especialista em comunicação e mídias sociais.
- **Goal**: Transformar dados técnicos em conteúdo engajador.

## 🏗️ Protocolo para Novos Agentes
Todo novo agente deve seguir o padrão **Enterprise**:
1. **Blueprint**: Definir Role, Goal e Backstory em `backend/src/crew/agents/`.
2. **Schema**: Criar Pydantic model para saídas estruturadas.
3. **Trace**: Garantir que o `trace_id` e `campaign_id` sejam persistidos.
4. **Instructions**: Atualizar o `STATUS.md` do módulo correspondente.

## 🧪 Agentes em Desenvolvimento
- `Rival Monitor`: Especialista em varredura de oposição.
- `Content Scheduler`: Automação de postagens baseadas em contexto.
- `Compliance Agent`: Verificador de leis eleitorais e LGPD.
