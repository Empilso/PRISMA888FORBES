# Status: Admin Module

## 🤖 INSTRUÇÕES OBRIGATÓRIAS PARA IA

### ANTES de trabalhar neste módulo:
1. ✅ Ler este STATUS.md completamente
2. ✅ Verificar seção "🐛 Bugs Conhecidos"
3. ✅ Identificar tarefa prioritária em "🚧 Em Progresso"
4. ✅ Verificar se há bloqueios documentados

### DURANTE o trabalho:
1. ✅ Seguir padrões do STYLE_GUIDE.md
2. ✅ Testar localmente antes de commitar
3. ✅ Verificar impacto em RLS (se mexer em dados)
4. ✅ Documentar decisões técnicas importantes

### DEPOIS de completar tarefa:
1. ✅ Atualizar este STATUS.md:
   - Mover tarefa de "🚧 Em Progresso" → "✅ Completo"
   - Adicionar data de conclusão (formato: YYYY-MM-DD)
   - Documentar decisão técnica (se relevante)
   - Atualizar "Última atualização" no topo
2. ✅ Verificar se gerou bugs conhecidos (adicionar na seção)
3. ✅ Commitar mudanças com mensagem clara

### REGRAS ESPECÍFICAS DESTE MÓDULO:
- 🔒 Admin tem acesso a dados sensíveis → sempre validar RLS
- 🧪 Testar fluxo de criação de candidato em dev antes de prod
- 📊 Logs de ações críticas devem ser salvos em audit_logs
- 🚨 Qualquer mudança em permissões precisa code review

---

## 📊 Status Atual

### Última atualização: 2026-02-07
**Responsável**: IDE + Perplexity

### ✅ Completo
- [x] Login admin funcionando (2026-02-07)
- [x] Criação de candidatos (2026-02-07)
- [x] RLS protegendo rotas (2026-02-06)
- [x] CPF adicionado ao schema (2026-02-06)
- [x] **Refatoração Layout**: Conversão para Server Component (2026-02-07)

### 🚧 Em Progresso (PRIORIDADE MÁXIMA)
- [ ] **Logs ao vivo na UI** (streaming real-time)
  - Bloqueio: nenhum
  - ETA: 2026-02-07
  - Responsável: IDE
  - Tarefa atual: Implementado (verificar e marcar completo)

### 📋 Backlog (Próximos)
- [ ] MFA obrigatório para admin (segurança LGPD)
- [ ] Dashboard de métricas da campanha
- [ ] Filtros avançados de candidatos
- [ ] Export CSV de dados

### 🐛 Bugs Conhecidos
- Nenhum atualmente

### 📝 Decisões Técnicas Recentes
- **2026-02-07**: Layout Admin convertido para Server Component para melhor LCP; Sidebar extraída para Client Component.
- **2026-02-07**: RLS recursion fix usando JWT metadata ao invés de query em profiles
- **2026-02-06**: CPF como VARCHAR(14) UNIQUE
