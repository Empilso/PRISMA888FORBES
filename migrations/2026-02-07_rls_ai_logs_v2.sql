-- Enable RLS on ai_execution_logs if not already enabled
ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'ai_execution_logs'
        AND policyname = 'Users can view own campaign logs'
    ) THEN
        CREATE POLICY "Users can view own campaign logs"
        ON public.ai_execution_logs
        FOR SELECT
        USING (
            campaign_id IN (
                SELECT id FROM public.campaigns
                WHERE id = ai_execution_logs.campaign_id
                AND (
                    -- Admin has access to everything
                    (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'super_admin')
                    OR 
                    -- User belongs to the campaign
                    EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.campaign_id = ai_execution_logs.campaign_id
                    )
                )
            )
        );
    END IF;
END $$;
