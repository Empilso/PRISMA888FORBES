-- TEMPORARY: Allow anon access to debug frontend auth issue
CREATE POLICY "Anon Full Access Competitors" ON competitors
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);
    
-- Verify it exists by blindly trying to handle conflicts if I re-run
-- (Postgres doesn't support IF NOT EXISTS for policies nicely in one line for all versions, but CREATE OR REPLACE isn't standard for policies either, so just CREATE)
