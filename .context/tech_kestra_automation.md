# PADRÕES TÉCNICOS: KESTRA AUTOMATION (SHEEPSTACK v3.0)

## Filosofia: IDEMPOTÊNCIA & GITOPS & OBSERVABILIDADE REATIVA
Automações devem ser:
1. **Idempotentes:** Rodar N vezes sem duplicar dados
2. **Versionadas:** Flows em código (Git), não cliques na UI
3. **Observáveis:** Logs estruturados e notificações
4. **Reativas:** O sistema GRITA quando falha (não espera você olhar logs)

## PILAR DE OBSERVABILIDADE REATIVA

**Regra de Ouro:** "Logs passivos são inúteis. O sistema deve gritar quando falha."

### Implementação Obrigatória
TODO flow DEVE ter o bloco `errors:` configurado com alertas automáticos.

```yaml
id: scraper_diario_oficial
namespace: prisma888.automation

tasks:
  - id: fetch_data
    type: io.kestra.plugin.scripts.python.Script
    script: |
      # Lógica do scraper
      ...

# OBRIGATÓRIO: Error Handling
errors:
  - id: alert_on_failure
    type: io.kestra.core.tasks.flows.WorkingDirectory
    tasks:
      - id: diagnose_error
        type: io.kestra.plugin.scripts.python.Script
        docker:
          image: ghcr.io/astral-sh/uv:python3.12-bookworm-slim
        script: |
          import json
          
          # Diagnóstico automático via IA
          error_context = {
            "flow_id": "{{ flow.id }}",
            "task_id": "{{ task.id }}",
            "error": "{{ task.error }}",
            "execution_id": "{{ execution.id }}"
          }
          
          # Chamar LLM para diagnóstico
          diagnosis = ai_diagnose(error_context)
          print(json.dumps({"diagnosis": diagnosis}))
      
      - id: send_alert
        type: io.kestra.plugin.notifications.slack.SlackIncomingWebhook
        url: "{{ secret('SLACK_WEBHOOK') }}"
        payload: |
          {
            "text": "🚨 *FALHA CRÍTICA*",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Flow:* `{{ flow.id }}`\n*Task:* `{{ task.id }}`\n*Erro:* {{ task.error }}"
                }
              },
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Diagnóstico IA:*\n{{ outputs.diagnose_error.vars.output }}"
                }
              },
              {
                "type": "actions",
                "elements": [
                  {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Ver Execução"},
                    "url": "{{ kestra.url }}/executions/{{ execution.id }}"
                  }
                ]
              }
            ]
          }
```

### Alert Flow Padrão (Reutilizável)
Crie um subflow para alertas:

```yaml
# kestra_flows/system/alert_flow.yaml
id: alert_flow
namespace: prisma888.system

inputs:
  - id: flow_id
    type: STRING
  - id: error_message
    type: STRING
  - id: execution_id
    type: STRING

tasks:
  - id: ai_diagnosis
    type: io.kestra.plugin.scripts.python.Script
    script: |
      # Diagnóstico via LLM
      ...
  
  - id: send_slack
    type: io.kestra.plugin.notifications.slack.SlackIncomingWebhook
    url: "{{ secret('SLACK_WEBHOOK') }}"
    payload: |
      {
        "text": "🚨 Falha em {{ inputs.flow_id }}",
        "blocks": [...]
      }
  
  - id: send_discord
    type: io.kestra.plugin.notifications.discord.DiscordWebhook
    url: "{{ secret('DISCORD_WEBHOOK') }}"
    content: "🚨 Falha detectada: {{ inputs.error_message }}"
```

### Uso do Alert Flow
```yaml
errors:
  - id: call_alert_flow
    type: io.kestra.core.tasks.flows.Flow
    namespace: prisma888.system
    flowId: alert_flow
    inputs:
      flow_id: "{{ flow.id }}"
      error_message: "{{ task.error }}"
      execution_id: "{{ execution.id }}"
```

## Estrutura de Flow Obrigatória

### 1. Metadata e Namespace
```yaml
id: scraper_diario_oficial
namespace: prisma888.automation
description: Scraper idempotente do Diário Oficial

labels:
  team: data-engineering
  criticality: high
```

### 2. Tasks com Retry
```yaml
tasks:
  - id: fetch_data
    type: io.kestra.plugin.scripts.python.Script
    docker:
      image: ghcr.io/astral-sh/uv:python3.12-bookworm-slim
    script: |
      import sys
      import json
      from datetime import datetime
      
      # IDEMPOTÊNCIA: Verificar se já existe
      existing = check_existing(date=datetime.now().date())
      if existing:
          print(json.dumps({"status": "skip", "reason": "already_exists"}))
          sys.exit(0)
      
      # Processar
      data = scrape_data()
      print(json.dumps({"status": "success", "records": len(data)}))
    
    retry:
      type: constant
      interval: PT30S
      maxAttempt: 3
    
    timeout: PT5M
```

### 3. Passar Dados Entre Tasks (Kestra.outputs)
```yaml
tasks:
  - id: extract
    type: io.kestra.plugin.scripts.python.Script
    script: |
      import json
      data = {"users": [1, 2, 3], "count": 3}
      print(json.dumps(data))  # Kestra captura stdout

  - id: transform
    type: io.kestra.plugin.scripts.python.Script
    script: |
      import json
      # Consumir output da task anterior
      previous = json.loads('{{ outputs.extract.vars.output }}')
      transformed = [u * 2 for u in previous['users']]
      print(json.dumps({"transformed": transformed}))

  - id: load
    type: io.kestra.plugin.scripts.python.Script
    script: |
      import json
      data = json.loads('{{ outputs.transform.vars.output }}')
      save_to_db(data['transformed'])
```

### 4. Error Handling e Notificações
```yaml
errors:
  - id: notify_on_failure
    type: io.kestra.plugin.notifications.slack.SlackIncomingWebhook
    url: "{{ secret('SLACK_WEBHOOK') }}"
    payload: |
      {
        "text": "❌ Flow {{ flow.id }} falhou",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Erro:* {{ task.id }}\n*Execution:* {{ execution.id }}"
            }
          }
        ]
      }
```

### 5. Triggers (Cron ou Event-Driven)
```yaml
triggers:
  - id: daily_scraper
    type: io.kestra.core.models.triggers.types.Schedule
    cron: "0 6 * * *"  # Todo dia às 6h
    timezone: America/Sao_Paulo

  - id: on_webhook
    type: io.kestra.core.models.triggers.types.Webhook
    key: "{{ secret('WEBHOOK_KEY') }}"
```

## Padrão de Idempotência (Python)

### Exemplo: Upsert no Supabase
```python
from supabase import create_client
from datetime import datetime

def upsert_records(records: list):
    """Insere ou atualiza (nunca duplica)"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Upsert com chave única
    result = supabase.table('diario_oficial').upsert(
        records,
        on_conflict='external_id,date'  # Chave composta
    ).execute()
    
    return result.data

def check_existing(date: datetime.date) -> bool:
    """Verifica se já processamos essa data"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    result = supabase.table('diario_oficial')\
        .select('id')\
        .eq('date', str(date))\
        .limit(1)\
        .execute()
    
    return len(result.data) > 0
```

## Logs Estruturados (JSON)
```python
import json
import logging

# Configurar logger
logging.basicConfig(
    format='%(message)s',
    level=logging.INFO
)

# Logar em JSON
def log_event(event: str, **kwargs):
    logging.info(json.dumps({
        "event": event,
        "timestamp": datetime.now().isoformat(),
        **kwargs
    }))

# Uso
log_event("scraper_started", url="https://example.com")
log_event("records_found", count=42)
log_event("scraper_finished", duration_seconds=12.5)
```

## Secrets Management
```yaml
tasks:
  - id: use_secrets
    type: io.kestra.plugin.scripts.python.Script
    env:
      SUPABASE_URL: "{{ secret('SUPABASE_URL') }}"
      SUPABASE_KEY: "{{ secret('SUPABASE_KEY') }}"
      OPENAI_API_KEY: "{{ secret('OPENAI_API_KEY') }}"
    script: |
      import os
      # Secrets disponíveis como env vars
      supabase_url = os.getenv('SUPABASE_URL')
```

## Checklist de Flow
- [ ] Flow é idempotente (não duplica dados)?
- [ ] Usa `Kestra.outputs()` para passar dados?
- [ ] Retry configurado (3 tentativas)?
- [ ] Timeout definido?
- [ ] Notificação em caso de falha?
- [ ] Logs estruturados (JSON)?
- [ ] Secrets via `{{ secret() }}`?
- [ ] Trigger configurado (cron ou webhook)?
