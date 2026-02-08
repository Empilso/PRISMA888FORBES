# Status: Backend CrewAI

## 🤖 INSTRUÇÕES OBRIGATÓRIAS PARA IA

### ANTES de trabalhar neste módulo:
1. ✅ Ler este STATUS.md completamente
2. ✅ Identificar tarefa prioritária em "🚧 Em Progresso"

### DEPOIS de completar tarefa:
1. ✅ Atualizar este STATUS.md
2. ✅ Rodar testes relevantes
3. ✅ Verificar se logs aparecem no Supabase

### REGRAS ESPECÍFICAS DESTE MÓDULO:
- 🔴 SEMPRE incluir `campaign_id` ao salvar logs
- 🔴 SEMPRE aplicar DeepSeek Patch antes de LLM call (se usar DeepSeek)
- 🔴 SEMPRE testar novo agente com mock data primeiro
- 🟡 Logs devem ser legíveis (não JSON raw)
- 🟢 Preferir tools existentes antes de criar nova
- 🟢 **Service Layer**: Lógica de negócio pesada deve ficar em `src/services/`, não em `src/api/`

---

## 📊 Status Atual

### Última atualização: 2026-02-07

### ✅ Completo
- [x] Campaign Analyst funcionando (2026-02-07)
- [x] Integração básica com Supabase (2026-02-07)
- [x] Log Streaming com campaign_id (2026-02-07)
- [x] **Refatoração Clean Arch**: Radar Premium separado em Service + API (2026-02-07)

### 🚧 Em Progresso
- [ ] Refatoração para suportar múltiplos LLMs
  - Tarefa: abstrair criação do LLM em factory robusta

### 📋 Backlog
- [ ] Agente de Pesquisa Jurídica
- [ ] Agente de Análise de Redes Sociais

### 🐛 Bugs Conhecidos
- Nenhum atualmente
