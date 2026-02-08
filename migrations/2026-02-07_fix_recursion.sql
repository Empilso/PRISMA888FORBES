-- Fix Infinite Recursion in Profiles RLS
-- Problem: The policy "Admins can view all profiles" queries 'profiles' table, triggering itself.
-- Solution: Use auth.jwt() metadata to check role, or rely on a SECURITY DEFINER function.
-- We will use auth.jwt() for performance and recursion safety.

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);
