-- Migração: Acesso Global do Super Admin
-- Descrição: Atualiza as políticas de RLS para permitir que super_admins vejam tudo.

-- 1. Permitir Super Admin ver todas as campanhas
DROP POLICY IF EXISTS "Org admins can view all org campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Super admins and org members can view campaigns" ON public.campaigns;
CREATE POLICY "Super admins and org members can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    id IN (
        SELECT campaign_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- 2. Permitir Super Admin ver todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    id = auth.uid()
);

-- 3. Permitir Super Admin ver todas as tarefas
DROP POLICY IF EXISTS "Candidates can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin and candidates can view tasks" ON public.tasks;
CREATE POLICY "Admin and candidates can view tasks"
ON public.tasks
FOR SELECT
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    assignee_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'candidate'
        AND profiles.campaign_id = tasks.campaign_id
    )
);
