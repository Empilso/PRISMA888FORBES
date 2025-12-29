-- Create map_notes table
CREATE TABLE IF NOT EXISTS public.map_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'note' NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL,
    author_id UUID,
    assignee_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_map_notes_campaign_id ON public.map_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_map_notes_location_id ON public.map_notes(location_id);
CREATE INDEX IF NOT EXISTS idx_map_notes_status ON public.map_notes(status);
CREATE INDEX IF NOT EXISTS idx_map_notes_type ON public.map_notes(type);

-- RLS
ALTER TABLE public.map_notes ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive based on project pattern, but ideally should filter by campaign_id check)
-- For now, allowing authenticated users to access all notes (backend enforces Logic)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_notes' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON public.map_notes
        FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'map_notes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.map_notes;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Publication supabase_realtime may not exist or error adding table';
END $$;

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_map_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_map_notes_updated_at ON public.map_notes;
CREATE TRIGGER trigger_map_notes_updated_at
    BEFORE UPDATE ON public.map_notes
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_map_notes_updated_at();
