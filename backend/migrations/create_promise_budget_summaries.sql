-- Create table for storing Radar Phase 2 (Budget/Fiscal) analysis
CREATE TABLE IF NOT EXISTS public.promise_budget_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL, -- Logical link, no strict FK to avoid cross-schema issues depending on setup, but usually FK is good.
    mandate_id UUID NOT NULL REFERENCES public.mandates(id),
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promise_budget_summaries_mandate_id ON public.promise_budget_summaries(mandate_id);
CREATE INDEX IF NOT EXISTS idx_promise_budget_summaries_campaign_id ON public.promise_budget_summaries(campaign_id);

-- RLS Policies (Enable Read/Write for authenticated users)
ALTER TABLE public.promise_budget_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.promise_budget_summaries
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.promise_budget_summaries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable update for authenticated users only" ON public.promise_budget_summaries
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
