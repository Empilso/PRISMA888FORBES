-- Fix RLS policies for admin pages
-- This allows authenticated users to read strategies and analysis_runs

-- Enable RLS if not already enabled
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read strategies" ON strategies;
DROP POLICY IF EXISTS "Allow authenticated users to read analysis_runs" ON analysis_runs;

-- Create read policies for authenticated users
CREATE POLICY "Allow authenticated users to read strategies" 
ON strategies FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to read analysis_runs" 
ON analysis_runs FOR SELECT 
TO authenticated 
USING (true);

-- Service role should have full access (if not already set)
DROP POLICY IF EXISTS "Service role full access on strategies" ON strategies;
DROP POLICY IF EXISTS "Service role full access on analysis_runs" ON analysis_runs;

CREATE POLICY "Service role full access on strategies" 
ON strategies FOR ALL 
TO service_role 
USING (true);

CREATE POLICY "Service role full access on analysis_runs" 
ON analysis_runs FOR ALL 
TO service_role 
USING (true);
