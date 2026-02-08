# Admin Module

## Objetivo
Área administrativa para gestão de campanhas, candidatos e análises de IA.

## Rotas
- `/admin/candidatos` - Lista e criação de candidatos
- `/admin/campaign/[id]/setup` - Análise de IA da campanha

## Permissões
- Apenas users com role `super_admin` (ou `admin` legado)
- Middleware verifica em `src/middleware.ts`
- RLS Policies garantem segurança no banco de dados

## Fluxo de criação de candidato
1. Admin preenche formulário em `/admin/candidatos/novo`
2. Server Action: `src/app/actions/create-campaign.ts`
3. Cria user em `auth.users`
4. Trigger `handle_new_user` cria profile
5. Vincula `campaign_id` e define role

## Arquivos principais
- `page.tsx`: Dashboard principal
- `candidatos/page.tsx`: Lista de candidatos
- `candidatos/novo/page.tsx`: Formulário de criação
- `campaign/[id]/page.tsx`: Detalhes do candidato e setup
