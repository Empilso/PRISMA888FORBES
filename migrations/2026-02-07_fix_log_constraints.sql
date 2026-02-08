-- Fix Logging Constraints
-- 1. Drop UNIQUE constraint on trace_id (allows multiple steps per run)
DROP INDEX IF EXISTS ai_execution_logs_trace_id_key;

-- 2. Allow NULL in raw_input (some thoughts have no input)
ALTER TABLE public.ai_execution_logs 
ALTER COLUMN raw_input DROP NOT NULL;

-- 3. Relax tool_calls to TEXT (Python sends string names, not JSONB)
-- Cast existing data if any
ALTER TABLE public.ai_execution_logs 
ALTER COLUMN tool_calls TYPE text USING tool_calls::text;

-- 4. Add index for Trace ID lookup (non-unique)
CREATE INDEX IF NOT EXISTS idx_logs_trace_id 
ON public.ai_execution_logs (trace_id);
