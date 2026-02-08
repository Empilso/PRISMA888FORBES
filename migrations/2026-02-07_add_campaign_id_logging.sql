-- Add campaign_id to ai_execution_logs
ALTER TABLE public.ai_execution_logs 
ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- Update RLS for Campaign-based access
DROP POLICY IF EXISTS "Users can view own campaign logs" ON public.ai_execution_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_execution_logs; -- Cleanup old permissive if exists

CREATE POLICY "Users can view own campaign logs"
ON public.ai_execution_logs FOR SELECT
USING (
  -- Admin/Super Admin can view all
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  OR
  -- Users can view logs for campaigns they belong to
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.campaign_id = ai_execution_logs.campaign_id
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_logs_campaign_id ON public.ai_execution_logs(campaign_id);
