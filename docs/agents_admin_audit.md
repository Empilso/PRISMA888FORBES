# Auditoria Enterprise: Admin de Agentes e Inventário de Crews

**Data:** 30/12/2025  
**Responsável:** Antigravity Agent  
**Status:** ⚠️ Alerta Crítico Encontrado

---

## 1. Resumo Executivo
A auditoria revelou um **problema crítico de integridade de dados**: a tabela `personas` no banco de dados está **VAZIA**, o que impede a execução da `GenesisCrew` (que falha se não encontrar uma persona ativa). Por outro lado, a tabela `agents` está corretamente populada com 13 agentes enterprise.

O sistema possui templates definidos em arquivos (JSON/SQL) que ainda não foram sincronizados. O Admin de Agentes é funcional, mas carece de travas de segurança básicas (ex: confirmação de exclusão).

---

## 2. Inventário de Personas (DB)
> **⚠️ CRÍTICO:** Nenhuma persona encontrada na tabela `public.personas`.

| Nome | Type | Process | Agentes | Model | Obs |
|------|------|---------|---------|-------|-----|
| - | - | - | - | - | **TABELA VAZIA** |

**Impacto:** Qualquer tentativa de rodar uma crew falhará com `ValueError: ❌ CRÍTICO: Nenhuma persona ativa encontrada no banco de dados!`.
**Ação Recomendada:** Executar `seed_enterprise_demo.sql` urgentemente ou usar API para recriar a persona `standard`.

---

## 3. Inventário de Templates & Seeds (Arquivos)
Identificamos definições de personas que servem como "Seeds" para popular o banco.

| Origem (Arquivo) | Template Name | Agentes | Processo | Descrição |
|------------------|---------------|---------|----------|-----------|
| `standard.json` | `standard` | 3 (Analyst, Strat, Planner) | - | Equipe tripla clássica. Textos em pt-BR. |
| `standard.json` | `aggressive` | 3 (Analyst, Strat, Planner) | - | Perfil combativo/oposição. Textos em pt-BR. |
| `seed_enterprise_demo.sql` | `enterprise-demo-v1` | **5** (Analyst, Strat, Planner, Policy, Compliance) | Sequential | Demo Enterprise com validação de políticas e compliance. |

---

## 4. Inventário de Agentes (DB)
A biblioteca de agentes está saudável, contendo 13 definições em pt-BR.

| Nome (Slug) | Role | Type | Tools |
|-------------|------|------|-------|
| `ingress_agent` | Ingress Agent | ingress | 2 tools |
| `evidence_agent` | Evidence Agent | evidence | 2 tools |
| `data_integrator` | Data Integrator (IBGE/TSE) | data_integrator | 2 tools |
| `policy_modeler` | Policy Modeler | policy_modeler | 0 tools |
| `demographics_analyzer` | Demographics Analyzer | demographics | 2 tools |
| `linguistic_agent` | Linguistic Agent | linguistic | 0 tools |
| `feynman_style_simulator` | Feynman-Style Simulator | simulator | 0 tools |
| `hormozi_style_simulator` | Hormozi-Style Simulator | simulator | 0 tools |
| `validator_agent` | Validator Agent | validator | 0 tools |
| `compliance_agent` | Compliance Agent | compliance | 0 tools |
| `auditor_agent` | Auditor Agent | auditor | 0 tools |
| `orchestrator_agent` | Orchestrator | orchestrator | 0 tools |
| `radar-...` | Agentes Python | radar | 0 tools |

---

## 5. Auditoria de UX (Admin de Agentes)
O módulo em `/admin/agentes` é funcional, mas apresenta riscos operacionais.

### Pontos de Atenção (Fricção & Risco)
1.  **Exclusão Perigosa**: Ao clicar no ícone de lixeira (`Trash2`), a exclusão é imediata via API (`deleteMutation`). **Risco Alto** de perda acidental.
2.  **Categorias Hardcoded**: O frontend usa uma lista fixa de categorias (`CATEGORY_CONFIG`) para ícones e filtros. Se novos tipos forem criados no backend, aparecerão com ícone genérico "Bot".
3.  **Busca Limitada**: A busca é client-side e só filtra pelo que já foi carregado. Se a lista crescer muito, a performance cairá.
4.  **Feedback Vazio**: Se a busca não retornar nada, a mensagem é genérica.

### Quick Wins (Recomendados)
- [ ] **Adicionar Dialog de Confirmação** antes de excluir agente. (Esforço: S | Risco: Baixo)
- [ ] **Sincronizar Categorias**: Carregar tipos disponíveis dinamicamente do DB ou definir Typescript Enum compartilhado. (Esforço: M | Risco: Baixo)
- [ ] **Badge de "Sem Tools"**: Visualmente alertar no card se o agente não tem ferramentas configuradas (risco de alucinação se for agente de pesquisa). (Esforço: S | Risco: Baixo)

---

## 6. Hardening: Guardrails de Dependências
Para evitar quebras de build futuras por "alucinação" de bibliotecas, fica estabelecido o seguinte protocolo para o Assistente de Código:

### 🛡️ Protocolo "Zero New Deps"
1.  **Verificação Prévia**: Antes de importar QUALQUER componente de UI (ex: `import { X } from "@/components/ui/x"`), verificar se o arquivo fisicamente existe em `frontend/src/components/ui/`.
    -   *Não assumir que tudo do shadcn/radix existe.*
2.  **Proibição de `npm install` Não Autorizado**: É vedado adicionar pacotes ao `package.json` sem solicitação explícita do usuário para uma feature nova.
3.  **Fallback Nativo**: Se precisar de um ícone ou componente que não existe:
    -   Use HTML/CSS nativo + Tailwind classes (ex: `div` com `border rounded` em vez de `<Card>`).
    -   Use `Lucide-React` (já instalado) para ícones, verificando se o nome do ícone existe na versão instalada.
4.  **Python**: Não adicionar `import` de libs não listadas no `requirements.txt` (ex: `pandas`, `numpy` são ok; `scikit-learn` verificar antes).

---

## 7. Próximos Passos Sugeridos
1.  **Correção Imediata**: Rodar `seed_enterprise_demo.sql` no banco para restaurar a funcionalidade da Genesis Crew.
2.  **Consolidar Templates**: Criar um endpoint ou script que leia `standard.json` e garanta que essas personas existam no banco.
