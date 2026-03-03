# SHEEPSTACK v3.0 - WORKFLOWS QUICK REFERENCE

## 🎯 Comandos Disponíveis

### Ative modo architect
**Quando usar:** Planejamento de features, definição de schema, arquitetura de sistema.

**O que carrega:**
- Persona: Arquiteto Sênior
- Regra: Schema-First (Frontend nunca começa antes do OpenAPI)
- Stack: Supabase (Auth/Vector), Kestra (GitOps), LangGraph (Stateful)

**Exemplo:**
```
Ative modo architect
Preciso criar um sistema de notificações em tempo real.
```

---

### Ative modo backend
**Quando usar:** Criar APIs, agentes AI, lógica de negócio.

**O que carrega:**
- Persona: Python Expert (FastAPI + LangGraph)
- Regra: Agentes Stateful (LangGraph com Checkpoints em Postgres)
- Padrões: `uv`, Pydantic V2, SSE (streaming), OpenTelemetry

**Exemplo:**
```
Ative modo backend
Crie um agente LangGraph que analisa sentimento de notícias.
```

---

### Ative modo frontend
**Quando usar:** Criar componentes React, integrar com API, design de UI.

**O que carrega:**
- Persona: React Specialist (Next.js 15 + Shadcn)
- Regra: Zero API Boilerplate (Orval/TanStack Query)
- Padrões: TanStack Table, React Hook Form, Zod

**Exemplo:**
```
Ative modo frontend
Crie um dashboard com tabela de eleitores (filtros, sorting, paginação).
```

---

### Ative modo kestra
**Quando usar:** Criar automações, scrapers, pipelines de dados.

**O que carrega:**
- Persona: Automation Engineer
- Regra: Idempotência (scripts rodam N vezes sem duplicar)
- Padrões: Kestra.outputs(), retry, error handling, logs JSON

**Exemplo:**
```
Ative modo kestra
Crie um scraper do Diário Oficial que roda a cada 6 horas.
```

---

## 📚 Documentação Completa

- **Workflows:** `.agent/workflows/mode-*.md`
- **Tech Standards:** `.context/tech_*.md`
- **Guia Detalhado:** `.agent/WORKFLOWS_GUIDE.md`

---

## 🔥 Regras Globais (Sempre Ativas)

Independente do modo, estas regras estão **sempre** na memória:

1. **Package Manager:** `uv` obrigatório (nunca pip/poetry)
2. **Database:** RLS obrigatório no Supabase
3. **Frontend:** Proibido hardcode de API (usar OpenAPI)
4. **Orquestração:** Kestra para processos > 1 segundo
5. **Zero Error Policy:** Type Hints (Python), strict mode (TypeScript)

---

## 💡 Dica Pro

Combine workflows com instruções específicas:

```
Ative modo backend

Crie um agente LangGraph que:
1. Persiste estado em Postgres (Checkpoints)
2. Usa SSE para streaming de tokens
3. Tem OpenTelemetry para tracing
4. É chamado via FastAPI endpoint
```

Eu já vou saber todos os padrões e bibliotecas necessárias.

---

## 🚀 Próximos Passos

1. **Teste agora:** Digite "Ative modo backend"
2. **Veja a diferença:** Compare com uma solicitação sem modo ativo
3. **Produza mais rápido:** Use os modos para manter contexto focado

**A SheepStack v3.0 está pronta para produção.**
