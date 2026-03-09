# PROMPT 001 - Sincronização e Auditoria de Dados (TCE-SP)

**Data:** 2026-03-09
**Status:** Análise Inicial - Gerente Especialista

## Contexto
O projeto PRISMA888FORBES atingiu precisão cirúrgica nas Despesas (R$ 794.613.325,04), mas enfrenta uma lacuna de R$ 71.932.475,72 nas Receitas em relação ao portal do TCE-SP.

## Problema
- **CSV:** R$ 683M
- **Portal Web:** R$ 755M
- **Causa Provável:** Receitas extraorçamentárias não incluídas no CSV detalhado.

## Proposta de Ação (Para Decisão do Mestre)
1. **Opção A (UI/UX - Educativa):** Manter o dado real do CSV e adicionar um Tooltip explicativo na UI informando que a diferença se refere a receitas extraorçamentárias.
2. **Opção B (Backend - Scraper):** Desenvolver o `backend/tcesp_live.py` para capturar o valor de vitrine do portal e substituir o card total.
3. **Opção C (Híbrida):** Criar um registro manual de ajuste no Supabase para equilibrar os valores.

**Aguardando decisão para gerar o prompt de execução.**
