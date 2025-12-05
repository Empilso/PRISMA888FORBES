# COMO USAR OS WORKFLOWS DE CONTEXTO

## O Problema que Resolvemos
Sem workflows, você precisaria ficar me lembrando das regras a cada sessão. Com workflows, você digita um comando e eu "acordo" já sabendo o que fazer.

## Comandos Disponíveis

### `/mode-architect`
**Quando usar:** Planejamento de features, arquitetura de sistema, decisões de segurança.

**O que carrega:**
- Persona do Arquiteto
- Regras de Stack (Python, Kestra, Postgres)
- Foco em escalabilidade e multi-tenancy

**Exemplo:**
```
Você: /mode-architect
Você: Preciso criar um sistema de notificações em tempo real para candidatos.
```

---

### `/mode-backend`
**Quando usar:** Escrever código Python, criar agentes AI, configurar Kestra flows.

**O que carrega:**
- Persona do Backend Developer
- Regras de `uv`, FastAPI, OpenTelemetry
- Exemplos de código (CrewAI + Kestra)

**Exemplo:**
```
Você: /mode-backend
Você: Crie um agente que analisa sentimento de notícias.
```

---

### `/mode-frontend`
**Quando usar:** Criar componentes React, integrar com API, design de UI.

**O que carrega:**
- Persona do Frontend Developer
- Regras de Schema First (OpenAPI)
- Padrões de Shadcn/UI e React Query

**Exemplo:**
```
Você: /mode-frontend
Você: Crie um dashboard para visualizar métricas de campanha.
```

---

## Por que isso é Revolucionário?

### Antes (Amador)
- Você: "Crie um agente"
- Eu: *Crio usando pip e sem OpenTelemetry* ❌
- Você: "Não! Use uv e adicione tracing!"
- Eu: "Ah, desculpa" *Refaz tudo*

### Depois (Profissional)
- Você: `/mode-backend`
- Você: "Crie um agente"
- Eu: *Já crio com uv, OpenTelemetry e exemplo de Kestra* ✅

---

## Regras Globais (Sempre Ativas)

Independente do modo, estas regras estão **sempre** na minha memória:

1. **Package Manager:** `uv` obrigatório (nunca pip/poetry)
2. **Database:** RLS obrigatório no Supabase
3. **Frontend:** Proibido hardcode de API (usar OpenAPI)
4. **Orquestração:** Kestra para qualquer processo > 1 segundo
5. **Zero Error Policy:** Type Hints (Python), strict mode (TypeScript)

---

## Dica Pro
Você pode combinar workflows com instruções específicas:

```
/mode-backend
Crie um scraper do Diário Oficial que:
1. Roda a cada 6 horas (Kestra cron)
2. Salva no Postgres com pgvector
3. Tem retry em caso de falha
```

Eu já vou saber que preciso usar `uv`, FastAPI, e configurar o Kestra flow com error handling.

---

## Próximos Passos
Teste agora mesmo! Digite `/mode-architect` e peça para eu planejar uma feature. Você vai ver a diferença na qualidade da resposta.
