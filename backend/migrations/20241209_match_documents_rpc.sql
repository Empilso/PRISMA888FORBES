-- =====================================================
-- MIGRAÇÃO: Função RPC para Busca Vetorial (LangChain)
-- =====================================================
-- Data: 2024-12-09
-- Descrição: Cria a função match_documents compatível
--            com LangChain SupabaseVectorStore
-- =====================================================

-- 1. Habilitar extensão pgvector (se ainda não estiver ativa)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Verificar/ajustar estrutura da tabela document_chunks
-- A tabela deve ter: id, campaign_id, content, embedding, metadata

-- 3. Dropar função antiga se existir (para recriar com assinatura correta)
DROP FUNCTION IF EXISTS match_documents(vector, int, uuid);
DROP FUNCTION IF EXISTS match_documents(vector, int, float, jsonb);

-- 4. Criar função de busca vetorial compatível com LangChain
-- O LangChain SupabaseVectorStore espera esta assinatura específica
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  filter_campaign_id uuid;
BEGIN
  -- Extrair campaign_id do filtro JSONB se fornecido
  filter_campaign_id := (filter->>'campaign_id')::uuid;
  
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 
    -- Aplica filtro de campaign_id se fornecido
    (filter_campaign_id IS NULL OR dc.campaign_id = filter_campaign_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Criar índice HNSW para acelerar busca vetorial (se não existir)
-- O índice HNSW é mais rápido que IVFFlat para buscas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'document_chunks' 
    AND indexname = 'document_chunks_embedding_idx'
  ) THEN
    CREATE INDEX document_chunks_embedding_idx 
    ON public.document_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
    
    RAISE NOTICE 'Índice HNSW criado com sucesso!';
  ELSE
    RAISE NOTICE 'Índice HNSW já existe.';
  END IF;
END $$;

-- 6. Criar índice para campaign_id (acelera filtros)
CREATE INDEX IF NOT EXISTS document_chunks_campaign_id_idx 
ON public.document_chunks(campaign_id);

-- 7. Conceder permissões
GRANT EXECUTE ON FUNCTION match_documents(vector, int, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents(vector, int, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION match_documents(vector, int, jsonb) TO service_role;

-- 8. Comentário para documentação
COMMENT ON FUNCTION match_documents IS 
'Função de busca vetorial para LangChain SupabaseVectorStore. 
Retorna os documentos mais similares com base na distância cosseno.
Suporta filtro por campaign_id via parâmetro JSONB.';

-- =====================================================
-- VERIFICAÇÃO: Testar se a função funciona
-- =====================================================
-- Execute manualmente para testar:
-- 
-- SELECT * FROM match_documents(
--   '[0.1, 0.2, ...]'::vector(1536),  -- embedding de teste
--   5,
--   '{"campaign_id": "223a036e-684e-4340-b1f6-81fa88c3ffbf"}'::jsonb
-- );
