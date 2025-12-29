# Auditoria: Contrato Strategy→Task (Examples/Tags/Pillar/Phase)

## 📊 Resultado da Consulta ao Banco (2024-12-29)

### Tabela `tasks` - Estado Atual
```json
[
  {"column_name": "tags", "data_type": "ARRAY", "udt_name": "_text", "is_nullable": "YES", "column_default": null},
  {"column_name": "examples", "data_type": "ARRAY", "udt_name": "_text", "is_nullable": "YES", "column_default": "'{}'::text[]"},
  {"column_name": "pillar", "data_type": "text", "udt_name": "text", "is_nullable": "YES", "column_default": null},
  {"column_name": "phase", "data_type": "text", "udt_name": "text", "is_nullable": "YES", "column_default": null}
]
```

### Tabela `strategies` - Estado Atual
```json
[
  {"column_name": "phase", "data_type": "USER-DEFINED", "udt_name": "strategy_phase"},
  {"column_name": "pillar", "data_type": "text", "udt_name": "text"},
  {"column_name": "examples", "data_type": "ARRAY", "udt_name": "_text"}
]
```

> [!WARNING]
> **Descoberta Crítica:** A tabela `strategies` **NÃO TEM** coluna `tags`!
> O backend copia `strategy.get("tags") or []` → sempre será `[]`.

---

## 🎯 Cenário Identificado: **B**

| Coluna | Tipo Atual | Tipo Desejado | Ação |
|--------|------------|---------------|------|
| `tags` | TEXT[] | JSONB | ⚠️ Converter |
| `examples` | TEXT[] | JSONB | ⚠️ Converter |
| `pillar` | TEXT | TEXT | ✅ OK |
| `phase` | TEXT | TEXT | ✅ OK |

---

## 🔧 Migration Proposta

**Arquivo:** `migrations/2024-12-29_convert_tasks_to_jsonb.sql`

**Estratégia de Conversão Segura:**
1. Criar colunas temporárias JSONB (`tags_jsonb`, `examples_jsonb`)
2. Copiar dados convertidos (`to_jsonb()`)
3. Renomear colunas antigas para backup (`_text_backup`)
4. Renomear novas colunas para nomes finais
5. Configurar defaults corretos

**Vantagens:**
- ✅ Sem perda de dados
- ✅ Backup preservado
- ✅ Rollback possível

---

## 📁 Migrations Conflitantes no Repositório

| Arquivo | Status |
|---------|--------|
| `add_examples_to_tasks.sql` | ❌ OBSOLETO (TEXT[]) |
| `add_examples_tags_to_tasks.sql` | ❌ OBSOLETO (conflita) |
| `add_pillar_and_phase_to_tasks.sql` | ❌ OBSOLETO (já existe) |
| `2024-12-29_convert_tasks_to_jsonb.sql` | ✅ **CANÔNICA** |

---

## ✅ Backend e Frontend

| Componente | Estado |
|------------|--------|
| `activate_strategy` | ✅ Já copia examples/tags/pillar/phase |
| Frontend guards | ✅ Já usa Array.isArray() |

---

## 📋 Checklist de Testes (Após Migration)

- [ ] Verificar que tasks.tags agora é JSONB
- [ ] Verificar que tasks.examples agora é JSONB
- [ ] Verificar dados antigos preservados em `*_text_backup`
- [ ] Criar Strategy → Ativar → Ver exemplos na UI
- [ ] Testar task sem exemplos → UI não quebra
