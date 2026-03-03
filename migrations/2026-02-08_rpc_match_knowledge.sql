-- Migration: RPC for matching knowledge vectors
-- Required for SupabaseVectorStore in LangChain

CREATE OR REPLACE FUNCTION public.match_knowledge_vectors (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.content,
    kv.metadata,
    1 - (kv.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_vectors kv
  WHERE 1 - (kv.embedding <=> query_embedding) > match_threshold
    AND (filter = '{}'::jsonb OR kv.metadata @> filter)
  ORDER BY kv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_knowledge_vectors IS 'Performs similarity search on knowledge_vectors with metadata filtering.';
