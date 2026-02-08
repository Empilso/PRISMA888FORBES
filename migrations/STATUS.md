# Status: Database & Migrations

## 🤖 INSTRUÇÕES OBRIGATÓRIAS PARA IA

### REGRAS ESPECÍFICAS DESTE MÓDULO:
- 🔒 NUNCA criar tabela sem RLS (Row Level Security)
- 🧪 Testar migration em dev antes de rodar em prod
- 📝 Documentar cada policy complexa
- ⚠️ Colunas com dados sensíveis (CPF, Senha, Token) devem ter comentários explicativos
- 🔄 Sempre verificar se migration é idempotente (IF EXISTS / IF NOT EXISTS)

---

## 📊 Status Atual

### Última atualização: 2026-02-07

### ✅ Completo
- [x] Tabela `ai_execution_logs` com `campaign_id`
- [x] RLS para isolamento de tenants (campanhas)
- [x] Correção de login (scripts de reset)
- [x] RLS Policy "Users can view own campaign logs" (2026-02-07)
- [x] **RLS CHECK CRÍTICO**: Correção de policies em addresses, promises, radar (2026-02-07)

### 🚧 Em Progresso
- [ ] Monitoramento contínuo de novas tabelas

### 📋 Backlog

- [ ] Índices de performance para logs antigos
- [ ] Particionamento de tabelas de logs (futuro)

### 🐛 Bugs Conhecidos
- Nenhum atualmente
