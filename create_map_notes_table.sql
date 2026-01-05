-- Migration: Create map_notes table
-- Description: Stores geospatial notes for the campaign map

CREATE TABLE IF NOT EXISTS public.map_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'alerta',      -- Renamed from note_type to match API/Frontend
  status TEXT NOT NULL DEFAULT 'aberta',    -- aberta | andamento | resolvida
  priority INT NOT NULL DEFAULT 3,          -- 1 (Low) to 5 (Critical)
  location_id BIGINT,                       -- Optional link to a location
  assignee_id UUID,                         -- Optional responsible user
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_map_notes_campaign_id ON public.map_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_map_notes_status ON public.map_notes(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_map_notes_type ON public.map_notes(campaign_id, type);
CREATE INDEX IF NOT EXISTS idx_map_notes_created_at ON public.map_notes(campaign_id, created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_map_notes_updated_at ON public.map_notes;

CREATE TRIGGER update_map_notes_updated_at
    BEFORE UPDATE ON public.map_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (Optional but recommended if RLS is enabled)
ALTER TABLE public.map_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.map_notes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.map_notes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.map_notes
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON public.map_notes
    FOR DELETE USING (true);
