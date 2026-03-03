-- Migration: 20260227_squad_aios_collaboration.sql
-- Goal: Add collaboration features (comments and activity history) to tasks.

BEGIN;

-- 1. Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create task_history table
CREATE TABLE IF NOT EXISTS public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_authenticated_select" ON public.task_comments;
CREATE POLICY "comments_authenticated_select" 
ON public.task_comments FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "comments_authenticated_insert" ON public.task_comments;
CREATE POLICY "comments_authenticated_insert" 
ON public.task_comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = profile_id);

-- 4. RLS for task_history
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_authenticated_select" ON public.task_history;
CREATE POLICY "history_authenticated_select" 
ON public.task_history FOR SELECT 
TO authenticated 
USING (true);

-- 6. Add assignee_id to tasks for elite isolation
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);

-- 7. Advance RLS for tasks (The Heart of Squad Isolation)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_staff_isolation" ON public.tasks;
CREATE POLICY "tasks_staff_isolation" 
ON public.tasks FOR SELECT 
TO authenticated 
USING (
    -- Super Admin vê tudo
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    OR
    -- Candidato vê tudo da sua campanha
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'candidate' AND campaign_id = (SELECT campaign_id FROM public.profiles WHERE id = auth.uid()))
    OR
    -- Staff só vê o que é dele
    (assignee_id = auth.uid())
);

COMMIT;
