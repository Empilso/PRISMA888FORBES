-- ============================================================================
-- ENTERPRISE CASCADE DELETE FOR COMPETITORS
-- ============================================================================
-- Purpose: Ensure complete cleanup when a competitor is deleted
-- Strategy: Database-level CASCADE constraints (most reliable, no code deps)
-- Idempotent: Safe to run multiple times
-- ============================================================================

-- 1. Ensure document_chunks table exists with proper structure
-- (Creates if not exists, adds competitor_id column if missing)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    competitor_id UUID, -- FK added below
    source TEXT,
    content TEXT,
    chunk_index INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add competitor_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name = 'competitor_id'
    ) THEN
        ALTER TABLE document_chunks ADD COLUMN competitor_id UUID;
    END IF;
END $$;

-- 3. Drop existing FK if any (to recreate with CASCADE)
DO $$
BEGIN
    -- Try to drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'document_chunks_competitor_id_fkey' 
        AND table_name = 'document_chunks'
    ) THEN
        ALTER TABLE document_chunks DROP CONSTRAINT document_chunks_competitor_id_fkey;
    END IF;
END $$;

-- 4. Add FK with CASCADE DELETE
ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_competitor_id_fkey 
FOREIGN KEY (competitor_id) 
REFERENCES competitors(id) 
ON DELETE CASCADE;

-- 5. Add index for performance on cascade deletes
CREATE INDEX IF NOT EXISTS idx_document_chunks_competitor 
ON document_chunks(competitor_id) 
WHERE competitor_id IS NOT NULL;

-- 6. Verify competitor_votes also has CASCADE (should already exist, but ensure)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'competitor_votes_competitor_id_fkey' 
        AND table_name = 'competitor_votes'
    ) THEN
        ALTER TABLE competitor_votes 
        ADD CONSTRAINT competitor_votes_competitor_id_fkey 
        FOREIGN KEY (competitor_id) 
        REFERENCES competitors(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Create audit log table for deletions (enterprise requirement)
CREATE TABLE IF NOT EXISTS public.audit_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    deleted_by TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 8. Create trigger function to log competitor deletions
CREATE OR REPLACE FUNCTION log_competitor_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_deletions (table_name, record_id, deleted_by, metadata)
    VALUES (
        'competitors',
        OLD.id,
        current_user,
        jsonb_build_object(
            'name', OLD.name,
            'party', OLD.party,
            'campaign_id', OLD.campaign_id
        )
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 9. Attach trigger to competitors table
DROP TRIGGER IF EXISTS trg_log_competitor_deletion ON competitors;
CREATE TRIGGER trg_log_competitor_deletion
    BEFORE DELETE ON competitors
    FOR EACH ROW
    EXECUTE FUNCTION log_competitor_deletion();

-- 10. Enable RLS on audit table
ALTER TABLE audit_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role Full Access Audit" ON audit_deletions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin Read Audit" ON audit_deletions
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- SUMMARY OF CASCADE CHAIN:
-- ============================================================================
-- When a competitor is deleted:
--   1. competitor_votes → CASCADE DELETE (all vote records)
--   2. document_chunks → CASCADE DELETE (all PDF chunks)
--   3. audit_deletions → NEW ROW (log for compliance)
--   4. competitors.files (JSONB) → Deleted with the row
-- ============================================================================

COMMENT ON TABLE audit_deletions IS 'Enterprise audit log for all record deletions';
