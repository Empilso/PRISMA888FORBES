# Status: Backend Tools

## 🤖 INSTRUÇÕES OBRIGATÓRIAS PARA IA

### REGRAS ESPECÍFICAS DESTE MÓDULO:
- 🛡️ Todas as tools devem ter tratamento de erro robusto (Try/Except)
- 📝 Output da tool deve ser formatado para fácil leitura do LLM
- ⚡ Tools que fazem chamadas externas (API) devem ter timeout
- 🧪 Criar teste unitário simples para cada nova tool

### ANTES de criar tool:
1. ✅ Verificar se já existe similar em `src/tools` ou `langchain`

### DEPOIS de criar tool:
1. ✅ Adicionar tool à lista de permitidas no `agents.yaml` ou `crew.py`
2. ✅ Testar manualmente com script isolado
3. ✅ Atualizar este STATUS.md

---

## 📊 Status Atual

### Última atualização: 2026-02-07

### ✅ Completo
- [x] Tool de Busca (Tavily)
- [x] Tool de Scraping (Firecrawl/BeautifulSoup)

### 🚧 Em Progresso
- [ ] Tool de Análise Legislativa
  - Tarefa: Integrar API da Câmara/Senado

### 📋 Backlog
- [ ] Tool de Check de Jurisprudência
- [ ] Tool de Monitoramento de Redes Sociais

### 🐛 Bugs Conhecidos
- Nenhum atualmente
