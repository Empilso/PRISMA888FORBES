# Status: Frontend Components

## 🤖 INSTRUÇÕES OBRIGATÓRIAS PARA IA

### ANTES de editar componentes:
1. ✅ Verificar se componente já existe em `src/components/ui` (shadcn/ui) antes de criar novo
2. ✅ Ler documentação do componente se for complexo (ex: Data Table, Calendar)

### DURANTE a criação/edição:
1. ✅ Usar `cn()` para classes condicionais (tailwind-merge)
2. ✅ Manter componentes pequenos e compostos (Composition over Inheritance)
3. ✅ Adicionar props de `className` para flexibilidade
4. ✅ Garantir acessibilidade (aria-labels, keyboard navigation)

### DEPOIS de finalizar:
1. ✅ Verificar warnings no console do navegador
2. ✅ Testar responsividade (Mobile/Desktop)
3. ✅ Atualizar este STATUS.md

---

## 📊 Status Atual

### Última atualização: 2026-02-07

### ✅ Completo
- [x] Instalação do shadcn/ui
- [x] Tema Dark/Light (ThemeProvider + ModeToggle)
- [x] Sidebar Responsiva
- [x] Login Form

- [x] LogConsole (Terminal Realtime Log Viewer)

### 🚧 Em Progresso

- [ ] Refatoração de componentes legados para usar shadcn/ui
  - CandidateCard -> Card (shadcn)
  - CustomButton -> Button (shadcn)

### 📋 Backlog
- [ ] Componente de Log Viewer Otimizado (Virtualização)
- [ ] Toast notifications padronizadas

### 🐛 Bugs Conhecidos
- Nenhum atualmente
