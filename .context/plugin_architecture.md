# PLUGIN ARCHITECTURE (SHEEPSTACK v3.0)

## Filosofia: CORE IMUTÁVEL, EXTENSÕES PLUGÁVEIS
**Regra de Ouro:** O Core não muda. Extensões são Plugins.

---

## 1. BACKEND PLUGIN ARCHITECTURE (FastAPI)

### Estrutura de Pastas
```
backend/
├── src/
│   ├── core/              # CORE (nunca muda)
│   │   ├── config.py
│   │   ├── middleware.py
│   │   └── dependencies.py
│   ├── api/               # CORE (routers base)
│   │   ├── health.py
│   │   └── auth.py
│   ├── plugins/           # PLUGINS (gitignored, carregados dinamicamente)
│   │   ├── __init__.py
│   │   ├── electoral/     # Plugin: Sistema Eleitoral
│   │   │   ├── router.py
│   │   │   ├── models.py
│   │   │   └── services.py
│   │   └── crm/           # Plugin: CRM
│   │       ├── router.py
│   │       └── models.py
│   └── main.py            # Carrega plugins dinamicamente
```

### Implementação: Routers Plugáveis

#### `src/main.py` (Core)
```python
from fastapi import FastAPI
from pathlib import Path
import importlib
import sys

app = FastAPI()

# Routers Core (sempre carregados)
from src.api import health, auth
app.include_router(health.router)
app.include_router(auth.router)

# Carregar Plugins Dinamicamente
def load_plugins():
    plugins_dir = Path(__file__).parent / "plugins"
    if not plugins_dir.exists():
        return
    
    for plugin_path in plugins_dir.iterdir():
        if plugin_path.is_dir() and (plugin_path / "router.py").exists():
            plugin_name = plugin_path.name
            
            # Importar dinamicamente
            module_path = f"src.plugins.{plugin_name}.router"
            try:
                module = importlib.import_module(module_path)
                if hasattr(module, "router"):
                    app.include_router(
                        module.router,
                        prefix=f"/plugins/{plugin_name}",
                        tags=[plugin_name]
                    )
                    print(f"✅ Plugin '{plugin_name}' carregado")
            except Exception as e:
                print(f"❌ Erro ao carregar plugin '{plugin_name}': {e}")

load_plugins()
```

#### Plugin Example: `src/plugins/electoral/router.py`
```python
from fastapi import APIRouter, Depends
from .models import Voter
from .services import VoterService

router = APIRouter()

@router.get("/voters", response_model=list[Voter])
async def get_voters(service: VoterService = Depends()):
    return await service.get_all_voters()

@router.post("/voters")
async def create_voter(voter: Voter, service: VoterService = Depends()):
    return await service.create_voter(voter)
```

### `.gitignore` (Core Repository)
```gitignore
# Ignorar plugins (cada plugin é um repo separado)
backend/src/plugins/*
!backend/src/plugins/__init__.py
!backend/src/plugins/README.md
```

### `backend/src/plugins/README.md`
```markdown
# Plugins Directory

Plugins são módulos externos que estendem a funcionalidade do Core.

## Como adicionar um plugin:
1. Clone o repositório do plugin aqui:
   ```bash
   git clone https://github.com/org/plugin-electoral.git electoral
   ```

2. O plugin será carregado automaticamente no próximo restart.

## Estrutura de um Plugin:
```
plugin_name/
├── router.py      # FastAPI router (obrigatório)
├── models.py      # Pydantic models
├── services.py    # Lógica de negócio
└── README.md      # Documentação
```
```

---

## 2. KESTRA PLUGIN ARCHITECTURE (Subflows)

### Estrutura de Flows
```
kestra_flows/
├── system/              # CORE (flows de sistema)
│   ├── health_check.yaml
│   └── alert_flow.yaml
├── subflows/            # SUBFLOWS (lógicas reutilizáveis)
│   ├── send_notification.yaml
│   ├── scrape_website.yaml
│   └── save_to_db.yaml
└── business/            # BUSINESS (flows específicos do projeto)
    ├── scraper_diario_oficial.yaml
    └── analyze_sentiment.yaml
```

### Subflow Example: `subflows/send_notification.yaml`
```yaml
id: send_notification
namespace: prisma888.subflows

inputs:
  - id: message
    type: STRING
  - id: channel
    type: STRING
    defaults: general

tasks:
  - id: send_slack
    type: io.kestra.plugin.notifications.slack.SlackIncomingWebhook
    url: "{{ secret('SLACK_WEBHOOK') }}"
    payload: |
      {
        "text": "{{ inputs.message }}",
        "channel": "{{ inputs.channel }}"
      }
```

### Usando Subflow: `business/scraper_diario_oficial.yaml`
```yaml
id: scraper_diario_oficial
namespace: prisma888.business

tasks:
  - id: scrape
    type: io.kestra.plugin.scripts.python.Script
    script: |
      # Lógica de scraping
      ...
  
  - id: notify_success
    type: io.kestra.core.tasks.flows.Flow
    namespace: prisma888.subflows
    flowId: send_notification
    inputs:
      message: "✅ Scraper concluído com sucesso"
      channel: "data-engineering"

errors:
  - id: notify_error
    type: io.kestra.core.tasks.flows.Flow
    namespace: prisma888.subflows
    flowId: send_notification
    inputs:
      message: "❌ Scraper falhou: {{ task.error }}"
      channel: "alerts"
```

---

## 3. FRONTEND PLUGIN ARCHITECTURE (Feature Modules)

### Estrutura de Features
```
frontend/
├── src/
│   ├── core/              # CORE (layout, auth)
│   │   ├── layout/
│   │   └── auth/
│   ├── features/          # FEATURES (módulos plugáveis)
│   │   ├── electoral/     # Feature: Sistema Eleitoral
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   └── crm/           # Feature: CRM
│   │       ├── components/
│   │       └── pages/
│   └── app/               # Next.js App Router
│       ├── layout.tsx
│       └── (features)/    # Rotas dinâmicas
│           ├── electoral/
│           └── crm/
```

### Dynamic Feature Loading
```typescript
// src/app/(features)/[feature]/page.tsx
import { notFound } from 'next/navigation';

const FEATURES = ['electoral', 'crm'];

export default function FeaturePage({ params }: { params: { feature: string } }) {
  if (!FEATURES.includes(params.feature)) {
    notFound();
  }
  
  // Lazy load feature
  const Feature = dynamic(() => import(`@/features/${params.feature}/pages/Index`));
  
  return <Feature />;
}
```

---

## BENEFÍCIOS DA ARQUITETURA PLUGÁVEL

### 1. **Separação de Concerns**
- Core: Mantido pela equipe principal
- Plugins: Desenvolvidos por times específicos

### 2. **Versionamento Independente**
- Core: v1.0.0
- Plugin Electoral: v2.3.1
- Plugin CRM: v1.5.0

### 3. **Deploy Seletivo**
- Cliente A: Core + Plugin Electoral
- Cliente B: Core + Plugin CRM + Plugin Analytics

### 4. **Testes Isolados**
- Core: 100% coverage
- Cada plugin: Seus próprios testes

---

## CHECKLIST DE PLUGIN

Antes de criar um plugin, verifique:

### Backend
- [ ] Plugin tem `router.py` com FastAPI router?
- [ ] Modelos Pydantic definidos?
- [ ] Testes unitários incluídos?
- [ ] README.md com documentação?
- [ ] Não depende de outros plugins?

### Kestra
- [ ] Subflow é reutilizável (não específico de um caso)?
- [ ] Inputs bem documentados?
- [ ] Error handling configurado?
- [ ] Testado localmente?

### Frontend
- [ ] Feature é autocontida (não depende de outras features)?
- [ ] Componentes reutilizáveis?
- [ ] Testes incluídos?
- [ ] Rota configurada no App Router?
