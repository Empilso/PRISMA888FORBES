-- Add competitor_id column to document_chunks for competitor PDF uploads
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_document_chunks_competitor 
ON document_chunks(competitor_id) 
WHERE competitor_id IS NOT NULL;

COMMENT ON COLUMN document_chunks.competitor_id IS 'Reference to competitor for adversary PDFs';
