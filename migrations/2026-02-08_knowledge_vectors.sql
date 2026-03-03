-- Migration: Create knowledge_vectors table for dedicated Knowledge Base storage
-- Part of the Real Infrastructure for Knowledge & Radar

-- Extension for vector support if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ===========================================
-- TABLE: knowledge_vectors
-- Dedicated table for Knowledge Base embeddings
-- ===========================================
CREATE TABLE IF NOT EXISTS public.knowledge_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(1536), -- Standard size for text-embedding-3-small (and DeepSeek compatibility)
    knowledge_file_id UUID REFERENCES public.knowledge_files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_file_id ON public.knowledge_vectors(knowledge_file_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_metadata ON public.knowledge_vectors USING gin (metadata);

-- HNSW Index for vector search (Adjust dimensions if needed)
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_embedding ON public.knowledge_vectors USING hnsw (embedding vector_cosine_ops);

-- RLS
ALTER TABLE public.knowledge_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.knowledge_vectors
    FOR ALL USING (true);

-- Documentation
COMMENT ON TABLE public.knowledge_vectors IS 'Dedicated vector store for Enterprise Knowledge Base files.';
