# Auditoria Radar Pivetta - 17/12/2024

## Resumo

| Tipo | Quantidade | Origem |
|------|------------|--------|
| SEED | 4 | Arquivo `seed_radar_promises.sql` |
| PLANO_GOVERNO | 9 | Fase 1 AI (extração real) |
| **Total** | **13** | |

---

## Promessas SEED (Demonstração)

IDs fixos do arquivo de seed:
- `a1111111-1111-1111-1111-111111111111`
- `a2222222-2222-2222-2222-222222222222`
- `a3333333-3333-3333-3333-333333333333`
- `a4444444-4444-4444-4444-444444444444`

**Status:** Marcadas como `source_type = 'SEED'`

---

## Promessas Reais (Fase 1)

- **9 promessas** extraídas do Plano de Governo do Pivetta
- **Criadas em:** 16/12/2024 via endpoint `/refresh-phase1`
- **Origem:** AI (GPT-4o-mini) analisando PDF do plano
- **Status:** Marcadas como `source_type = 'PLANO_GOVERNO'`

---

## Verificações (promise_verifications)

| ID | Promise ID | Status | Tipo |
|----|------------|--------|------|
| b1111111-... | a1111111-... | CUMPRIDA | SEED |
| b2222222-... | a2222222-... | PARCIAL | SEED |
| b3333333-... | a3333333-... | NAO_INICIADA | SEED |
| b4444444-... | a4444444-... | DESVIADA | SEED |

> ⚠️ Todas as 4 verificações são SEED. Promessas reais ainda não têm verificações.

---

## Ação Recomendada

Para produção limpa, executar:
```sql
-- Remover dados de demonstração
DELETE FROM public.promise_verifications WHERE promise_id LIKE 'a%1111%';
DELETE FROM public.promises WHERE source_type = 'SEED';
```

---

## Query de Auditoria

```sql
SELECT source_type, COUNT(*) 
FROM public.promises 
WHERE campaign_id = '8c3c03e4-1b5b-462a-841a-b5624661e5aa'
GROUP BY source_type;
```
