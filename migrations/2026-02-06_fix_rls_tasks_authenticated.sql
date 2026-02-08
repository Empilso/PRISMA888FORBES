-- Migration: fix_rls_tasks_authenticated.sql
-- Goal: Fix 400 Bad Request / RLS Error on tasks table by allowing authenticated access.
-- Scope: public.tasks
-- Date: 2026-02-06
-- Author: Auditor Enterprise

BEGIN;

-- 1. Ensure RLS is ON (Idempotent)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 2. Clean up potentially conflicting policies (if any exist)
DROP POLICY IF EXISTS "tasks_authenticated_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_delete" ON public.tasks;
DROP POLICY IF EXISTS "Public Read Tasks" ON public.tasks; -- Removing any unsafe public policy attempts
DROP POLICY IF EXISTS "Service Role Full Access Tasks" ON public.tasks;

-- 3. Create "Authenticated Only" Policies

-- SELECT: Authenticated users can read all tasks (scoped by app logic)
CREATE POLICY "tasks_authenticated_select"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Authenticated users can insert, must have campaign_id
CREATE POLICY "tasks_authenticated_insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (campaign_id IS NOT NULL);

-- UPDATE: Authenticated users can update, must have campaign_id
CREATE POLICY "tasks_authenticated_update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (campaign_id IS NOT NULL);

-- DELETE: Authenticated users can delete
CREATE POLICY "tasks_authenticated_delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);

-- 4. Ensure Service Role still has full access (Best Practice)
CREATE POLICY "tasks_service_role_full_access"
ON public.tasks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;
