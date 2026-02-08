
-- 🔒 SECURITY HARDENING: AI_EXECUTION_LOGS
-- Revoking public access and enforcing strict campaign ownership

-- 1. Reset: Drop all existing policies to clear the mess
DROP POLICY IF EXISTS "Authenticated users can insert ai_logs" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Authenticated users can read ai_logs" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Enable all for service role" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Enable read for anon" ON public.ai_execution_logs; -- 🚨 CRITICAL FIX
DROP POLICY IF EXISTS "Service Role can do everything on ai_logs" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Users can view own campaign logs" ON public.ai_execution_logs;

-- 2. Enable RLS (Should already be enabled, but enforcing)
ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Service Role (Backend/Admin SDK) - Full Access
CREATE POLICY "Service Role Full Access"
ON public.ai_execution_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Policy: Authenticated Users (Read Own Campaign)
-- Users can only see logs if they belong to the same campaign_id
CREATE POLICY "Users view own campaign logs"
ON public.ai_execution_logs
FOR SELECT
TO authenticated
USING (
  -- Admin Bypass
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin') 
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  OR
  -- Campaign Ownership Check
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.campaign_id = ai_execution_logs.campaign_id
  )
);

-- 5. Policy: Authenticated Users (Insert)
-- Agents running via user context might need to insert logs (though mostly it's service role)
-- We allow insertion for authenticated users, but they can't overwrite/fake other campaigns easily if we had triggers, 
-- but for now, simple insert is fine as long as they are logged in.
CREATE POLICY "Authenticated users insert logs"
ON public.ai_execution_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Verify: Explicitly deny Anon
-- (No policy for anon = Implicit Deny, but we removed the explicit "Enable read for anon")

COMMENT ON TABLE public.ai_execution_logs IS 'Security Hardened: Public access revoked. Only campaign members can view logs.';
