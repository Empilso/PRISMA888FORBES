# SUPER PROMPT PARA IDE: SINCRO E UI (Fase 1)

**Ação:** Implementação de transparência fiscal e preparação de tema.

---

### 🚨 CONTEXTO (PARA A IA DA IDE):
O projeto está estável após rollback. Temos uma discrepância de R$ 71.932.475,72 nas Receitas em relação ao portal do TCE-SP porque o CSV orçamentário não inclui ingressos extraorçamentários. Precisamos dar transparência técnica a isso e preparar o CSS para o Dark Mode.

### 🛠️ TAREFAS:

#### 1. [FRONTEND] Explicação das Receitas no Dashboard
No componente `/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/frontend/src/components/fiscal-analytics/VisaoGeralTab.tsx`:
- Localize o **Tooltip do card de Receita Total**.
- Substitua a mensagem atual por esta explicação técnica:
  - **Título:** "Conformidade Contábil (LRF)"
  - **Texto:** "Valor auditado via Receita Orçamentária Líquida. O Portal do TCE-SP exibe o montante bruto de R$ 755M, que consolida Ingressos Extraorçamentários (retenções/cauções) e repasses intraorçamentários não computáveis como arrecadação direta."
  - **Destaque Visual:** Adicionar um bloco comparativo dentro do Tooltip:
    - `Prisma: R$ 683M (Orçamentária)`
    - `TCE-SP: R$ 755M (Bruta/Extra)`

#### 2. [FRONTEND] Fundação do Dark Mode Enterprise
No arquivo `/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/frontend/src/app/globals.css`:
- Adicione o seletor `.enterprise-dark` que aplique o `@apply dark`.
- Garanta que as variáveis de background/text no Dark Mode usem as variáveis HSL já definidas no arquivo.
- Adicione uma variável `--shadow-premium` com o valor `0 10px 30px -10px rgba(0, 0, 0, 0.5)` para uso em cards.

---
**Critério de Sucesso:** A interface deve educar o usuário sobre os números sem alterar os valores do banco, e o CSS deve estar pronto para a troca de tema sem quebras.
