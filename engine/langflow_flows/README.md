# 🚀 Supabase Research Crew - Forbes Edition

## 📋 Descrição

Crew de agentes automatizada que processa dados políticos usando **DeepSeek** (mais barato e eficiente):

1. **Lê** dados de candidatos do Supabase
2. **Organiza** e estrutura os dados
3. **Pesquisa** informações adicionais
4. **Cria** tarefas estratégicas
5. **Salva** tudo de volta no Supabase

## 🎯 Arquitetura da Crew

```
┌─────────────┐
│ 📥 Input    │
│  Inicial    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  🗄️ Supabase    │
│     Reader      │ ← Lê tabela 'candidates'
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│  📊 Data         │
│   Organizer      │ ← DeepSeek organiza
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  🔍 Research     │
│     Agent        │ ← DeepSeek pesquisa
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ✅ Task         │
│   Organizer      │ ← DeepSeek cria tarefas
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  💾 Supabase    │
│     Writer      │ ← Salva na tabela 'tasks'
└────────┬────────┘
         │
         ▼
┌─────────────┐
│ ✨ Output   │
│   Final     │
└─────────────┘
```

## 🔧 Como Importar no Langflow

### Método Simples (Recomendado)

1. Abra **http://localhost:7860**
2. Clique nos **"⋮"** (três pontinhos) ao lado de "Projects"
3. Selecione **"Import"**
4. Escolha: `supabase_research_crew.json`
5. ✅ **Pronto!** O flow já está 100% configurado

## ✨ Já Configurado

O flow já vem com **TUDO configurado**:

### 🔐 Credenciais Supabase
- ✅ URL: `https://gsmmanjpsdburmntgpg.supabase.co`
- ✅ Anon Key: Configurada
- ✅ Service Role Key: Configurada

### 🤖 DeepSeek AI
- ✅ API Key: Configurada
- ✅ Model: `deepseek-chat`
- ✅ Endpoint: `https://api.deepseek.com`

### 💰 Por que DeepSeek?

DeepSeek é **muito mais barato** que outros modelos:
- GPT-4: ~$0.03/1K tokens
- Gemini: ~$0.00025/1K tokens
- **DeepSeek**: ~$0.00014/1K tokens 🎉

Economia de **~50% comparado ao Gemini** e **~214x mais barato que GPT-4**!

## 📊 Tabelas Usadas

### Input (Leitura)
- **Tabela**: `candidates`
- **Campos esperados**: id, nome, cargo, partido, propostas

### Output (Escrita)
- **Tabela**: `tasks`
- **Campos criados**:
  - `title` - Título da tarefa
  - `description` - Descrição detalhada
  - `status` - Status (todo/in_progress/done)
  - `priority` - Prioridade (high/medium/low)
  - `due_date` - Data de entrega
  - `assigned_to` - Responsável
  - `candidate_id` - ID do candidato relacionado
  - `tags` - Tags da tarefa

## 🎮 Como Usar

### 1. Importe o Flow
Siga as instruções de importação acima

### 2. Execute
Digite um comando como:
```
Analise todos os candidatos e crie tarefas estratégicas para a campanha
```

### 3. Aguarde o Processamento
A crew vai:
- Buscar candidatos no Supabase
- Organizar os dados
- Pesquisar informações
- Criar tarefas priorizadas
- Salvar tudo no banco

### 4. Confira os Resultados
Verifique a tabela `tasks` no Supabase!

## 🤖 Agentes da Crew

### 1. 📊 Data Organizer Agent
**LLM**: DeepSeek Chat (temp: 0.3)
**Função**: 
- Limpa e estrutura dados brutos
- Identifica campos importantes
- Organiza em JSON estruturado

### 2. 🔍 Research Agent
**LLM**: DeepSeek Chat (temp: 0.5)
**Função**:
- Pesquisa informações sobre candidatos
- Valida dados com fontes oficiais
- Analisa viabilidade de propostas
- Identifica pontos fortes/fracos

### 3. ✅ Task Organizer Agent
**LLM**: DeepSeek Chat (temp: 0.4)
**Função**:
- Cria tarefas estratégicas
- Define prioridades
- Estabelece prazos
- Organiza em Kanban

## 📝 Personalização

Você pode ajustar:

### Mudar Tabelas
```json
// No Supabase Reader
"table_name": "sua_tabela_de_candidatos"

// No Supabase Writer
"table_name": "sua_tabela_de_tarefas"
```

### Ajustar Prompts
Edite o `system_message` de cada agente para mudar o comportamento

### Mudar Temperatura
```json
"temperature": 0.3  // Mais determinístico (0.0 - 1.0)
"temperature": 0.8  // Mais criativo
```

## 🐛 Troubleshooting

### ❌ Erro de conexão Supabase
- Verifique se as credenciais estão corretas
- Confirme que as tabelas `candidates` e `tasks` existem
- Teste a conexão manualmente

### ❌ Agentes não respondem
- Verifique a chave da DeepSeek
- Confirme que você tem créditos na API
- Teste a API: `curl https://api.deepseek.com/v1/models -H "Authorization: Bearer sk-..."`

### ❌ Dados não são salvos
- Verifique se a tabela `tasks` tem os campos corretos
- Confirme que está usando a Service Role Key (não a Anon Key)

## 🔍 Exemplo de Uso

**Input:**
```
Analise os candidatos a prefeito e crie 5 tarefas urgentes
```

**Output esperado na tabela `tasks`:**
```json
[
  {
    "title": "Pesquisar histórico do Candidato X",
    "description": "Investigar propostas anteriores e índice de aprovação",
    "status": "todo",
    "priority": "high",
    "due_date": "2025-11-30",
    "assigned_to": "Equipe de Pesquisa",
    "candidate_id": "123",
    "tags": ["pesquisa", "urgente"]
  },
  ...
]
```

## 📊 Monitoramento

Acompanhe no Langflow:
- ✅ Status de cada agente
- 📝 Logs de execução
- ⚡ Tempo de processamento
- 💰 Custo estimado

## 🔌 API do Langflow

### 🔑 Credenciais

A API Key do Langflow está configurada:

```bash
LANGFLOW_API_KEY=sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk
LANGFLOW_API_URL=http://localhost:7860/api/v1
```

### 📝 Uso Programático

Use o cliente Python incluído:

```python
from langflow_client import LangflowClient

client = LangflowClient()

# Listar todos os flows
flows = client.list_flows()

# Executar a Research Crew
result = client.run_research_crew(
    "Analise os candidatos e crie tarefas urgentes"
)
```

### 🌐 Endpoints Disponíveis

```bash
# Listar flows
GET http://localhost:7860/api/v1/flows
Authorization: Bearer sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk

# Executar flow
POST http://localhost:7860/api/v1/run/{flow_id}
Authorization: Bearer sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk
Content-Type: application/json

{
  "input_value": "Seu comando aqui",
  "output_type": "chat",
  "input_type": "chat"
}
```

### 💡 Exemplo com cURL

```bash
# Listar flows
curl -X GET "http://localhost:7860/api/v1/flows" \
  -H "Authorization: Bearer sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk"

# Executar flow (substitua FLOW_ID)
curl -X POST "http://localhost:7860/api/v1/run/FLOW_ID" \
  -H "Authorization: Bearer sk-NPkae9kQtGMXFDK9qKqc_KYZdkh5kaekBuwVZTh7hHk" \
  -H "Content-Type: application/json" \
  -d '{
    "input_value": "Analise os candidatos",
    "output_type": "chat"
  }'
```

### 🔒 Segurança

**IMPORTANTE**: A API Key está registrada localmente em `.env.langflow`:
- ✅ Não commite este arquivo no Git
- ✅ Use apenas em ambiente local/desenvolvimento
- ✅ Para produção, use variáveis de ambiente do sistema

## 🚀 Próximas Melhorias

- [ ] Cache de respostas para economizar
- [ ] Retry automático em falhas
- [ ] Webhook para notificações
- [ ] Dashboard de métricas
- [ ] Integração com Telegram/WhatsApp
- [ ] API Gateway para produção
- [ ] Rate limiting

---

**Configurado por**: Antigravity AI
**Data**: 2025-11-27
**LLM**: DeepSeek Chat
**Status**: ✅ Pronto para uso
