# Status: Campaign & Candidate Module

## 🤖 INSTRUÇÕES OBRIGATÓRIAS PARA IA

### REGRAS ESPECÍFICAS DESTE MÓDULO:
- 🔒 Dados de campanha são isolados por RLS -> Testar com usuários de campanhas diferentes
- 📊 Dashboard deve carregar rápido -> Usar React Server Components onde possível
- ⚡ Cache de dados estáticos (ex: info do candidato) é prioritário

### ANTES de trabalhar:
1. ✅ Verificar se a tarefa envolve dados sensíveis da campanha

### DEPOIS de completar:
1. ✅ Testar isolamento de dados (User A não vê campanha User B)
2. ✅ Atualizar este STATUS.md

---

## 📊 Status Atual

### Última atualização: 2026-02-07

### ✅ Completo
- [x] Roteamento dinâmico `/campaign/[id]`
- [x] Setup inicial de campanha (Wizard)
- [x] Dashboard básico

### 🚧 Em Progresso
- [ ] Integração completa com Realtime Logs na Dashboard
  - Tarefa: Mostrar logs da campanha atual no widget de "Atividade Recente"

### 📋 Backlog
- [ ] Upload de arquivos (Logo, Plano de Governo)
- [ ] Configuração de Paleta de Cores da Campanha

### 🐛 Bugs Conhecidos
- Nenhum atualmente
