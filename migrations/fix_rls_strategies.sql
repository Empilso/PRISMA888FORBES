-- Enable RLS on tables where it's disabled but policies exist
ALTER TABLE IF EXISTS strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crew_run_logs ENABLE ROW LEVEL SECURITY;

-- Ensure strategies policies allow anon/authenticated read access
DROP POLICY IF EXISTS "Public Read Strategies" ON strategies;
CREATE POLICY "Public Read Strategies" ON strategies
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Strategies" ON strategies;
CREATE POLICY "Service Role Full Access Strategies" ON strategies
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure analysis_runs policies
DROP POLICY IF EXISTS "Public Read Analysis Runs" ON analysis_runs;
CREATE POLICY "Public Read Analysis Runs" ON analysis_runs
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Analysis Runs" ON analysis_runs;
CREATE POLICY "Service Role Full Access Analysis Runs" ON analysis_runs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure competitors policies
DROP POLICY IF EXISTS "Public Read Competitors" ON competitors;
CREATE POLICY "Public Read Competitors" ON competitors
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Competitors" ON competitors;
CREATE POLICY "Service Role Full Access Competitors" ON competitors
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
