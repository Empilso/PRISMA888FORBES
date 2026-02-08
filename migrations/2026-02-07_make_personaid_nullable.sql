-- Make persona_id nullable in ai_execution_logs
ALTER TABLE public.ai_execution_logs 
ALTER COLUMN persona_id DROP NOT NULL;
