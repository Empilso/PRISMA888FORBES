
# Relatório de Auditoria Completa PRISMA 888

**Data:** 30/12/2025  
**Escopo:** Admin de Agentes, Crews, Inventário e IA Tática

---

## 1. Achados Críticos (Top 3)

1.  🔴 **Banco de Personas Vazio:** A tabela `public.personas` está zerada. Isso é crítico pois a `GenesisCrew` (o motor principal) falha sem uma persona ativa. É necessário rodar os seeds (ex: `seed_enterprise_demo.sql`) urgente.
2.  🟡 **IA Tática "Solitária":** Existe um fluxo funcional de "Ação de Guerrilha" no mapa, mas ele opera isolado (`TacticalAIService`), sem conexão com a engine principal de Crews. Ele gera texto simples e salva como `strategy`, ignorando os Agentes Enterprise já criados.
3.  ⚠️ **Exclusão sem Confirmação:** No Admin, deletar um agente é um clique único e irreversível.

---

## 2. Admin de Agentes (Mapa do Sistema)

### Frontend (`/admin/agentes`)
*   **Rotas:** `src/app/admin/agentes/library/page.tsx`
*   **Componentes Chave:**
    *   `AgentForm.tsx`: Gerencia abas de Prompt, Tools, Knowledge e Compliance.
    *   `Badge` de Categoria: Usa lista hardcoded (`CATEGORY_CONFIG`) para ícones (Ingress, Evidence, Radar, etc).
*   **Estado:** Usa `React Query` para fetch/cache. Busca client-side simples.
*   **Capacidades:** Criar, Editar (abas), Deletar (imediato). Não tem botão "Simular" ou "Duplicar" visível.

### Backend (API)
*   **Personas:** `src/api/personas.py`
    *   Modelo `PersonaCreate`: Aceita `config` como Dict livre (JSONB), o que é ótimo para flexibilidade (permite `manage_model`, `process_type` dinâmicos).
    *   Validação: Flexível (Pydantic `Dict[str, Any]`), ideal para crews dinâmicas.
*   **Agentes:** `src/api/agents.py`
    *   Modelo `AgentBase`: Normaliza `compliance_rules` e `tools`, prevenindo erros de tipo.

---

## 3. Crews & Personas: Inventário Real

### No Banco de Dados (Status Atual)
*   **Personas:** **0 (Zero)**. Tabela vazia.
*   **Agentes:** **13 Agentes Enterprise**. Tabela populada corretamente.
    *   Tipos: `ingress`, `evidence`, `data_integrator`, `policy_modeler`, `compliance`, etc.

### Arquivos de Seed (Templates Disponíveis)
O sistema possui 3 "personalidades" prontas para serem carregadas:

| Template | Origem | Agentes | Processo | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `standard` | `standard.json` | 3 (Analyst, Strat, Planner) | - | Equipe tripla clássica. |
| `aggressive` | `standard.json` | 3 (Analyst, Strat, Planner) | - | Perfil de oposição/combate. |
| `enterprise-demo` | `seed_enterprise_demo.sql` | **5** (+ Policy, Compliance) | **Sequential** | Demo robusta com validação. |

---

## 4. IA Tática / Guerrilha no Mapa

### Estado Atual: **EXISTE** (Funcional, mas Simples)
Já existe um botão e um fluxo implementado para gerar ações locais.

*   **Frontend:** `ElectoralMapFull.tsx`
    *   **Botão:** "Gerar Estratégia" <ZapIcon/> (dentro do Sheet de detalhes do local).
    *   **Trigger:** `handleGenerateGuerrillaAction` chama `POST /campaign/.../tactical_action`.
*   **Backend:** `src/api/campaign.py` -> `src/services/tactical_ai.py`
    *   **Endpoint:** Refatorado para usar `TacticalAIService`.
    *   **Lógica:** Prompt único ("Você é um estrategista de guerrilha...") que recebe contexto do local (votos, rivais) e gera:
        1.  Título da ação.
        2.  Descrição texto corrido.
    *   **Persistência:** Salva direto na tabela `strategies` com tag `category: "Guerrilha"`.

### Oportunidade (Não duplicar!)
**Não crie um novo fluxo.** A estrutura `TacticalAIService` já faz o trabalho "leve".
*   **Recomendação:** Evoluir o `TacticalAIService` para, no futuro, chamar a `GenesisCrew` com uma persona "Tactical" em vez de usar um prompt solto. Isso aproveitaria os agentes "Officer" e "Integrator" que já existem no banco.

---

## 5. Quick Wins de UX (Priorizados)

| Melhoria | Objetivo | Esforço | Risco |
| :--- | :--- | :--- | :--- |
| **1. Seed de Personas** | Restaurar o funcionamento do sistema rodando o SQL de demo. | **Pequeno** | Baixo |
| **2. Confirm Dialog** | Adicionar "Tem certeza?" antes de deletar agente no Admin. | **Pequeno** | Baixo |
| **3. Ícone Loading** | No mapa, mudar o texto do botão "Gerar" para "Consultando QG..." durante a geração. | **Pequeno** | Baixo |
| **4. Badge "Sem Tools"** | No Admin, alertar visualmente agentes sem tools (risco de alucinação). | **Médio** | Baixo |
| **5. Filtro de Tipo** | No Admin, carregar tipos dinamicamente do DB (hoje é hardcoded). | **Médio** | Baixo |
| **6. Feedback no Mapa** | Exibir Toast mais detalhado com o Título da ação gerada. | **Pequeno** | Baixo |
| **7. Botão "Ver Ação"** | Após gerar no mapa, link direto para abrir o Kanban/Ação criada. | **Médio** | Baixo |

---

**Conclusão:** O sistema tem bases sólidas (Admin flexível, Agentes populados, Mapa com fluxo tático funcional). O único bloqueio real é a falta de Personas no DB, que pode ser resolvido em minutos via seed.
