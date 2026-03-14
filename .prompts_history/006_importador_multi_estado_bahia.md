# PROMPT: Motor de Importação Multi-Estado (Adapter Pattern) para PRISMA888

**Contexto:**
Atualmente nosso app possui um script solto `backend/import_municipal_expenses_complete.py` que importa arquivos CSV limpos do TCE-SP (Votorantim) diretamente para a tabela Supabase `municipal_expenses`. Agora, precisamos suportar os dados confuso do TCM-BA (Senhor do Bonfim), extraídos de PDFs e planilhas sem padrão fixo (com colunas como "N° do Proc. Contrato", "Extra - Orçamentária", etc).

**Objetivo Estratégico:**
Temos que isolar a lógica de ingestão de dados por estado sem quebrar o Frontend. Para isso, usaremos o "Adapter Pattern", criando "tradutores" específicos para as planilhas de cada tribunal que sempre cuspirão o mesmo JSON limpo para o banco de dados.

**Diretrizes de Implementação:**

**1. Estrutura de Diretórios Limpa:**
- Crie o diretório `backend/importers/tce_sp/` e **mova** o script atual `import_municipal_expenses_complete.py` para dentro dele.
- Crie o diretório `backend/importers/tcm_ba/` e crie um **novo** script `import_senhor_do_bonfim_pdf.py` dentro dele.

**2. O Novo Script do TCM-BA (Senhor do Bonfim):**
- O arquivo fonte está em `/home/carneiro888/CARNEIRO888/Obsidian/][=_=][ ZIKUALDO/COMINHO COM COGNIÇÃO/PRISMA888/senhor do bonfim/despesas-sem-cnpj - inicial.pdf`. Se possível, use bibliotecas como `pdfplumber` ou converta as tabelas para montar um DataFrame local. 
- Mapeie as colunas locais do PDF da seguinte forma para o nosso padrão: 
  - `Favorecido` -> `nm_fornecedor`
  - `Valor Pago` ou similar -> `vl_despesa`
  - `Data de Liquidação` ou `Data de Empenho` -> `dt_emissao_despesa`
  - `Extra - Orçamentária / Despesa` -> `evento`
  - Adicione a `municipio_slug = "senhor-do-bonfim-ba"` e `ano = 2025` e `mes = 1` fixos por enquanto, ou extraia da tabela.

**3. Integridade do Banco de Dados:**
- Persista no Supabase (tabela `municipal_expenses`) **exatamente** como SP faz: `municipio_slug`, `vl_despesa`, `dt_emissao_despesa`, `evento`, `nm_fornecedor`, `raw_hash` (para evitar duplicações rodando duas vezes).

**4. Frontend Intocado:**
- O arquivo `frontend/src/components/fiscal-analytics/VisaoGeralTab.tsx` deve permanecer intacto quanto à lógica de cálculo (Líquido = Empenho + Reforço - Anulado). Ele automaticamente passará a buscar os dados novos simplesmente quando o candidato logado for de Senhor do Bonfim.

**Ação da IDE:**
Por favor, leia a tabela inicial do PDF de Senhor do Bonfim, entenda suas anomalias, crie o novo script parser em Python e refatore as pastas dos importers agora. Não mexa no backend de SP, apenas mova o arquivo.
