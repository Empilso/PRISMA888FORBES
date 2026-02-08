# Database Schema

## Tabelas Principais
- **auth.users**: Gerenciado pelo Supabase Auth.
- **public.profiles**: Perfil do usuário (1:1 com auth.users). Contém `role`, `campaign_id`, `cpf`.
- **public.campaigns**: Campanhas políticas. Dados macro, configurações.
- **public.tasks**: Tarefas kanban dos candidatos.
- **public.strategies**: Estratégias geradas pela IA.
- **public.ai_execution_logs**: Logs detalhados de execução dos agentes (Traceability).

## RLS Policies (Row Level Security)
A segurança é garantida a nível de linha no banco de dados:

- **Profiles**:
  - `Admins can view all profiles`: Baseado em verificação de Metadata (JWT) para evitar recursão.
  - `Users can view own profile`: `auth.uid() = id`.

- **Campaigns**:
  - Acesso restrito a membros da campanha ou admins.

- **AI Logs**:
  - Permite leitura pública (atualmente) ou restrita aos donos da campanha.

## Migrations
As migrações SQL ficam na pasta `migrations/` na raiz do projeto.
Para aplicar:
1. Criar arquivo `.sql` com timestamp.
2. Rodar script python `scripts/apply_migration.py`.
