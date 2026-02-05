-- Allow authenticated and anon users to manage analysis_runs (Delete versions)
DROP POLICY IF EXISTS "Authenticated Manage Analysis Runs" ON analysis_runs;
DROP POLICY IF EXISTS "Anon Manage Analysis Runs" ON analysis_runs;

CREATE POLICY "Authenticated Manage Analysis Runs" ON analysis_runs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon Manage Analysis Runs" ON analysis_runs
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);
