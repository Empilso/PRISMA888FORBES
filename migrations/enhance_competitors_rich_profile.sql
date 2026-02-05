-- Enhance competitors for Rich Profile
ALTER TABLE competitors 
    ADD COLUMN IF NOT EXISTS tse_id TEXT, -- ID used to link voting data
    ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb; -- Array of {name, url, type} for uploaded docs

-- Create table for granular competitor voting data (Mirrors electoral_data structure but for competitors)
CREATE TABLE IF NOT EXISTS competitor_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL, -- Bairro/Cidade
    votes INT DEFAULT 0,
    total_votes INT DEFAULT 0, -- Context (total votes in that location)
    percentage NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access Policies for competitor_votes
ALTER TABLE competitor_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Competitor Votes" ON competitor_votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated Manage Competitor Votes" ON competitor_votes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon Full Access Competitor Votes" ON competitor_votes
    FOR ALL TO anon USING (true) WITH CHECK (true);
