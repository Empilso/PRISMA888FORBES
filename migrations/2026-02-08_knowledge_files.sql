-- Create knowledge_files table
CREATE TABLE IF NOT EXISTS knowledge_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    campaign_id UUID, -- Optional for now, but good to have context
    vector_id TEXT, -- ID from vector store
    status TEXT DEFAULT 'pending', -- pending, processing, indexed, error
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
ON knowledge_files
FOR SELECT
TO authenticated
USING (true);

-- Allow insert access to authenticated users (uploaders)
CREATE POLICY "Allow insert access to authenticated users"
ON knowledge_files
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow update access to authenticated users (status/metadata update)
CREATE POLICY "Allow update access to authenticated users"
ON knowledge_files
FOR UPDATE
TO authenticated
USING (true);

-- Allow delete access to authenticated users (cleanup)
CREATE POLICY "Allow delete access to authenticated users"
ON knowledge_files
FOR DELETE
TO authenticated
USING (true);
