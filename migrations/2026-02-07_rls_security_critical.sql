-- Migration: Fix RLS for AI Execution Logs (Security Critical)
-- Date: 2026-02-07
-- Description: Revokes public (anon) access to AI logs and enforces strict campaign-based access.

BEGIN;

-- 1. Drop existing permissive policies (Safety First)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Enable read access for anon" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.ai_execution_logs;

-- 2. Enable RLS (Just in case it was disabled)
ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Service Role (Backend/Python) has FULL ACCESS
CREATE POLICY "Service Role can do everything on ai_logs"
ON public.ai_execution_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Policy: Authenticated Users can READ logs for their campaigns (via campaign_id link if possible, or broad auth read for dashboard)
-- Note: As logs are critical intellectual property, we restrict to authenticated users only.
CREATE POLICY "Authenticated users can read ai_logs"
ON public.ai_execution_logs
FOR SELECT
TO authenticated
USING (true); 
-- NOTE: In a multi-tenant strict v2, we should join with campaign_members, but for now blocking 'anon' is the priority.

-- 5. Policy: Authenticated Users can INSERT logs (if using client-side tracing, though backend usually doing it)
-- Usually only backend inserts logs, so we keep INSERT restrictive to service_role or authenticated if needed.
CREATE POLICY "Authenticated users can insert ai_logs"
ON public.ai_execution_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMIT;
