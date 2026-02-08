-- ==============================================================================
-- CRITICAL SECURITY FIX: Enforce RLS on Radar & Promises Tables
-- ==============================================================================
-- Vulnerability: Policies were defined as USING (true), allowing cross-tenant access.
-- Fix: Enforce campaign_id check against profiles.campaign_id OR admin role.
-- ==============================================================================

-- 1. Drop Insecure Policies on Promises
DROP POLICY IF EXISTS "Users can view promises from their campaigns" ON public.promises;
DROP POLICY IF EXISTS "Users can insert promises" ON public.promises;
DROP POLICY IF EXISTS "Users can update promises" ON public.promises;
DROP POLICY IF EXISTS "Users can delete promises" ON public.promises;

-- 2. Create Secure Policy for Promises
CREATE POLICY "Secure: Users view own campaign promises" ON public.promises
FOR ALL
USING (
    campaign_id IN (
        SELECT campaign_id FROM public.profiles 
        WHERE id = auth.uid()
    )
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'super_admin')
);

-- 3. Drop Insecure Policies on Promise Verifications
DROP POLICY IF EXISTS "Users can view verifications" ON public.promise_verifications;
DROP POLICY IF EXISTS "Users can insert verifications" ON public.promise_verifications;
DROP POLICY IF EXISTS "Users can update verifications" ON public.promise_verifications;

-- 4. Create Secure Policy for Promise Verifications
-- (Inherits access via promise_id -> promises.campaign_id)
CREATE POLICY "Secure: Users access verifications via promise" ON public.promise_verifications
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.promises p
        WHERE p.id = promise_verifications.promise_id
        AND (
            p.campaign_id IN (
                SELECT campaign_id FROM public.profiles
                WHERE id = auth.uid()
            )
            OR
            (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'super_admin')
        )
    )
);

-- 5. Drop Insecure Policies on Radar Executions
DROP POLICY IF EXISTS "Radar exec public read" ON public.radar_executions;
DROP POLICY IF EXISTS "Radar exec service write" ON public.radar_executions;

-- 6. Create Secure Policy for Radar Executions
CREATE POLICY "Secure: Users access own campaign executions" ON public.radar_executions
FOR ALL
USING (
    campaign_id IN (
        SELECT campaign_id FROM public.profiles
        WHERE id = auth.uid()
    )
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'super_admin')
);

-- Note: 'profiles' table is the source of truth for user-campaign relationship in this architecture.
-- 'campaign_members' was referenced in intent but 'profiles' contains the direct link.
-- Confirmed by STATUS.md and previous RLS files.
