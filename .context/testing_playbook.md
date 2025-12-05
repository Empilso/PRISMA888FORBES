# TESTING PLAYBOOK (SHEEPSTACK v3.0)

## Filosofia: PIPELINE IS LAW
**Regra de Ouro:** Nada sobe para produção sem passar pelo CI.

---

## 1. BACKEND TESTING (Python + FastAPI)

### Setup
```bash
uv add --dev pytest pytest-asyncio httpx faker
```

### Estrutura de Testes
```
backend/
├── src/
└── tests/
    ├── unit/           # Testes unitários (lógica pura)
    ├── integration/    # Testes de API (httpx)
    └── agents/         # Testes de grafos LangGraph
```

### Testes de API (httpx async)
```python
import pytest
from httpx import AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_get_users():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users")
        assert response.status_code == 200
        assert len(response.json()) > 0
```

### Testes de Agentes LangGraph (Checkpoint Inspection)
**NÃO apenas mockar a LLM. Testar o FLUXO do grafo.**

```python
import pytest
from langgraph.checkpoint.memory import MemorySaver
from src.agents.analyst import create_analyst_graph

@pytest.mark.asyncio
async def test_analyst_agent_flow():
    # Usar MemorySaver para testes (não Postgres)
    checkpointer = MemorySaver()
    graph = create_analyst_graph(checkpointer=checkpointer)
    
    # Executar o grafo
    config = {"configurable": {"thread_id": "test_thread"}}
    result = await graph.ainvoke(
        {"messages": ["Analise o sentimento desta notícia: ..."]},
        config=config
    )
    
    # Verificar o estado final
    assert "sentiment" in result
    assert result["sentiment"] in ["positive", "negative", "neutral"]
    
    # Inspecionar checkpoints (histórico)
    checkpoints = list(checkpointer.list(config))
    assert len(checkpoints) > 0  # Verificar que salvou estado

@pytest.mark.asyncio
async def test_agent_handles_error():
    """Testar que o agente lida com erros gracefully"""
    checkpointer = MemorySaver()
    graph = create_analyst_graph(checkpointer=checkpointer)
    
    # Input inválido
    result = await graph.ainvoke(
        {"messages": [""]},  # Mensagem vazia
        config={"configurable": {"thread_id": "test_error"}}
    )
    
    # Verificar que retornou erro estruturado
    assert "error" in result
    assert result["error"]["type"] == "validation_error"
```

### Testes de Lógica de Negócio (Unit)
```python
from src.services.sentiment_analyzer import analyze_sentiment

def test_sentiment_analyzer():
    text = "Eu amo este produto!"
    result = analyze_sentiment(text)
    assert result == "positive"
```

---

## 2. FRONTEND TESTING (Next.js + Vitest)

### Setup
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

### Testes de Componentes
```typescript
import { render, screen } from '@testing-library/react';
import { UserCard } from '@/components/UserCard';

test('renders user name', () => {
  render(<UserCard user={{ id: 1, name: 'João' }} />);
  expect(screen.getByText('João')).toBeInTheDocument();
});
```

### Testes de Hooks Gerados (Orval)
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useGetUsers } from '@/api/generated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('useGetUsers fetches data', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  const { result } = renderHook(() => useGetUsers(), { wrapper });
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(3);
});
```

---

## 3. KESTRA FLOW TESTING

### Testes de Idempotência
```python
# tests/kestra/test_scraper_idempotency.py
import pytest
from src.scrapers.diario_oficial import scrape_and_save

def test_scraper_is_idempotent(db_session):
    """Rodar 2x não deve duplicar dados"""
    date = "2025-01-15"
    
    # Primeira execução
    result1 = scrape_and_save(date)
    count1 = db_session.query(DiarioOficial).filter_by(date=date).count()
    
    # Segunda execução (mesma data)
    result2 = scrape_and_save(date)
    count2 = db_session.query(DiarioOficial).filter_by(date=date).count()
    
    # Deve ter o mesmo número de registros
    assert count1 == count2
    assert result2["status"] == "skip"
```

---

## 4. CI/CD PIPELINE (.github/workflows/)

### Backend CI
```yaml
name: Backend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install uv
        run: curl -LsSf https://astral.sh/uv/install.sh | sh
      
      - name: Install dependencies
        run: |
          cd backend
          uv sync
      
      - name: Run tests
        run: |
          cd backend
          uv run pytest --cov=src --cov-report=xml
      
      - name: Lint
        run: |
          cd backend
          uv run ruff check src/
```

### Frontend CI
```yaml
name: Frontend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: |
          cd frontend
          pnpm install
      
      - name: Run tests
        run: |
          cd frontend
          pnpm test
      
      - name: Lint
        run: |
          cd frontend
          pnpm lint
```

---

## 5. COVERAGE REQUIREMENTS

**Mínimos Obrigatórios:**
- Backend: 80% coverage
- Frontend: 70% coverage
- Agentes: 100% dos fluxos críticos testados

**Bloqueio de PR:**
- CI deve falhar se coverage cair abaixo do mínimo
- Linting deve passar (ruff, eslint)

---

## CHECKLIST DE QUALIDADE

Antes de fazer PR, verifique:

### Backend
- [ ] Testes de API (httpx) para todos os endpoints?
- [ ] Testes de agentes (checkpoint inspection)?
- [ ] Testes de idempotência para scrapers?
- [ ] Coverage >= 80%?
- [ ] Ruff passou (sem warnings)?

### Frontend
- [ ] Testes de componentes críticos?
- [ ] Testes de hooks gerados (Orval)?
- [ ] Coverage >= 70%?
- [ ] ESLint passou?
- [ ] TypeScript compila sem erros?

### Kestra
- [ ] Flow testado localmente?
- [ ] Idempotência verificada?
- [ ] Error handling configurado?
- [ ] Logs estruturados (JSON)?
