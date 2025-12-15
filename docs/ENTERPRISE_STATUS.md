# Enterprise Agents - Status Report

## O que o usuário já consegue fazer HOJE
1.  **Refatoração de UI (Sidebar e Modal)**: A interface de gerenciamento de agentes (`/admin/agentes`) agora segue um padrão visual limpo ("Google/Opal-like"), facilitando a leitura de configurações complexas.
2.  **Biblioteca de Agentes**: Existe uma estrutura base (`/admin/agentes/library`) e uma API (`/api/agents`) para listar agentes enterprise, embora a interface de criação no modal ainda esteja usando lógicas hardcoded para os agentes "básicos" (Analyst, Strategist, etc.).
3.  **Personas Enterprise**: O sistema suporta (via backend seeding) personas com múltiplos agentes enterprise (`ingress`, `evidence`, `policy_modeler`, etc.), como demonstrado pela persona "Conselho de Análise – Revista".

## Próximos Passos Técnicos (Roadmap)
Para atingir o fluxo 100% Enterprise com até 12 agentes em produção:

1.  **Conexão Modal ↔ Biblioteca**:
    *   Modificar o `CreatePersonaDialog` para que, ao clicar em "Adicionar Agente", ele consulte o endpoint `/api/agents` e permita selecionar agentes da biblioteca (ex: `policy-modeler`, `compliance-agent`).
    *   Atualmente, o modal usa uma lista estática `AVAILABLE_AGENTS`.

2.  **Geração Dinâmica de Tasks (`GenesisCrew` Adapter)**:
    *   Atualizar o `genesis_crew.py` para iterar sobre a lista dinâmica de agentes da persona (vinda do JSON `config.agents`) e gerar tasks automaticamente baseadas no `role` e `goal` de cada um.
    *   Hoje, o GenesisCrew tem lógica condicional (`if 'policy-modeler' in agents: ...`), o que escala mal para 50 tipos de agentes. O ideal é um *Task Factory* genérico.

3.  **UI de Orquestração (Drag-and-Drop)**:
    *   Criar uma interface visual onde o usuário possa arrastar agentes da biblioteca para a "linha de montagem" da equipe, definindo a ordem de execução visualmente.
    *   Isso substituirá o atual "Template Selector" rígido.

4.  **Padronização de Outputs**:
    *   Garantir que agentes de compliance e auditoria (ex: `compliance-agent`) tenham slots de saída definidos no JSON final, para que o frontend possa exibir "Alertas de Risco" separadamente do "Plano Estratégico".
