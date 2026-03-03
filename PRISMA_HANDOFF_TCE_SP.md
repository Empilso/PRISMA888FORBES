# 🚀 PRISMA888 - Handoff: Sincronia de Dados TCE-SP

**Data/Hora do Checkpoint:** 20 de Fevereiro de 2026
**Módulo Atual:** Dashboard Executivo (Gestão Municipal) - `VisaoGeralTab.tsx`
**Objetivo Atual:** Sincronia contábil de R$ 0,01 entre o Prisma888 e o Portal de Transparência do TCE-SP.

## 🎯 O Que Acabamos de Concluir (VITÓRIAS)

1. **Motor de Despesas Cirúrgico (Atingimos R$ 794.613.325,04 exatos):**
   - O script `backend/import_municipal_expenses_complete.py` foi reescrito para usar a coluna `id_despesa_detalhe` (row[0]) como semente do Hash de Upsert. Isso impediu que eventos com o mesmo valor (como uma Anulação e um Empenho) se sobrescrevessem.
   - Foram importados com sucesso **53.712** registros de despesas de Votorantim (2025).
   - No frontend (`VisaoGeralTab.tsx`), aplicamos a regra contábil estrita da Lei 4320/64: *Despesa Líquida = Empenhado + Reforço - Anulado/Anulação*. Eventos como "Pago" e "Liquidado" são ignorados para não duplicar o montante.

2. **Paginação Infinita no Supabase:**
   - Havia um bug silencioso onde as queries do frontend e backend batiam no teto de segurança da API REST do Supabase (limite de 1.000 linhas). 
   - Refatoramos o `fetchExpenses` dentro do componente React para realizar um loop com `.range()`, sugando todos os +50 mil registros em lotes de 1.000. O mesmo foi feito para as Receitas.

3. **Fim do MOCK DATA nas Receitas:**
   - O card de Receita Total agora consulta a verdadeira tabela `municipal_revenues`.
   - Limpamos as duplicações do banco de dados e importamos silenciosamente **1.529** linhas limpas do CSV Oficial do TCE de 20/02/2026.

## ⚠️ Onde Estamos Travados (PRÓXIMOS PASSOS NA NOVA SESSÃO)

**O Mistério dos 71 Milhões nas Receitas**
- **Portal TCE-SP (Print):** R$ 755.145.185,04
- **CSV Bruto Baixado (Soma Matemática Absoluta):** R$ 683.212.709,32
- **Diferença:** R$ 71.932.475,72 exatos.

*Por que isso acontece?*
O CSV "Receita Detalhada" disponibilizado pelo TCE-SP para download só traz as *Receitas Orçamentárias* puras. O valor inflado do painel web consolida **Receitas Extraorçamentárias** (ex: retenções de folha, cauções, depósitos judiciais) e/ou repasses específicos que não detalham no dataset aberto de receitas correntes.

### 📝 O que DEVE ser feito assim que a nova sessão iniciar:

1. **[FRONTEND] Investigação Visual e Adaptação do Card de Receita:**
   - O usuário vai precisar confirmar se no Portal do TCE (talvez em outra tela/aba) existe o breakdown desses R$ 71M extras.
   - Decisão Arquitetural: Devemos injetar essa diferença no backend como um registro "Ajuste de Consolidação do TCE" (se o cliente exigir que bata o número exato do painel), ou devemos educar o usuário na UI com um *tooltip* informando: `"Receita Arrecadada Líquida Oficial: R$ 683M. O Painel do TCE inclui R$ 71M de receitas intra/extraorçamentárias que não compõem a arrecadação direta"`.

2. **[BACKEND] Consolidação Final:**
   - Se os números da Receita continuarem sendo uma questão, podemos criar um mini crawler em Python (`tcesp_live.py`) que vai na página web, captura o HTML publico pra pegar os `755M` totais da vitrine e joga direto pro Supabase, esquecendo o CSV para esse card específico.

## 🧩 Onde os arquivos críticos estão:

- `frontend/src/components/fiscal-analytics/VisaoGeralTab.tsx` (Filtros, Cálculos, e Fetch infinito).
- `backend/import_municipal_revenues.py` (Script refatorado seguro contra dupes).
- `backend/import_municipal_expenses_complete.py` (Script com o hash imbatível).

---
**Mensagem para a IA da próxima Sessão:**
"Leia este documento. O foco imediato é resolver a Discrepância das Receitas (683M no CSV vs 755M na UI do TCE) decidindo entre ajustar a UI ou fazer scrapper do HTML, já que nos CSVs os dados orçamentários estão perfeitos."
