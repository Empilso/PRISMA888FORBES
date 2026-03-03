-- Migration: 2026-02-08_knowledge_infra.sql
-- Description: Centralized Knowledge Base Infrastructure for Radar 2.0

-- 1. Knowledge Files Table
CREATE TABLE IF NOT EXISTS knowledge_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    category TEXT DEFAULT 'geral' CHECK (category IN ('plano_governo', 'dossie', 'geral', 'noticia_verificacao')),
    city_id UUID REFERENCES cidades(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Document Chunks (for Vector Search)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES knowledge_files(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Using OpenAI 1536-dim embeddings
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_knowledge_files_category ON knowledge_files(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_city_id ON knowledge_files(city_id);

-- 4. Enable RLS
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function for Vector Match (RPC)
CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT,
    filter_city_id UUID DEFAULT NULL,
    filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    file_id UUID,
    content TEXT,
    similarity FLOAT,
    category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.file_id,
        kc.content,
        1 - (kc.embedding <=> query_embedding) AS similarity,
        kf.category
    FROM knowledge_chunks kc
    JOIN knowledge_files kf ON kc.file_id = kf.id
    WHERE (1 - (kc.embedding <=> query_embedding) > match_threshold)
      AND (filter_city_id IS NULL OR kf.city_id = filter_city_id)
      AND (filter_category IS NULL OR kf.category = filter_category)
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
