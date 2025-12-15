-- Migration: Create crew_run_logs table for Console Master
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS crew_run_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    campaign_id UUID REFERENCES campaigns(id),
    event_type TEXT NOT NULL, -- 'system' | 'task_start' | 'task_end' | 'tool_start' | 'tool_end' | 'ai_thought' | 'error'
    agent_name TEXT,
    task_name TEXT,
    tool_name TEXT,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_run_logs_run_id ON crew_run_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_crew_run_logs_created_at ON crew_run_logs(created_at);

-- Grant access (adjust based on your RLS needs, usually service_role bypasses RLS but authenticated users might need read access)
ALTER TABLE crew_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON crew_run_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for service role only" ON crew_run_logs FOR INSERT WITH CHECK (true);
