-- =====================================================
-- MIGRAÇÃO: MEGA PACK - Inteligência Competitiva
-- =====================================================
-- Data: 2024-12-09
-- Descrição: Prepara o sistema para agentes táticos e
--            análise de documentos de rivais
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CLASSIFICAR AGENTES (Estratégico vs Tático)
-- =====================================================
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'strategy';
-- Valores: 'strategy' (Genesis) ou 'tactical' (Guerrilha)

-- Adiciona constraint para validar tipos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'personas_type_check'
    ) THEN
        ALTER TABLE public.personas 
        ADD CONSTRAINT personas_type_check 
        CHECK (type IN ('strategy', 'tactical'));
    END IF;
END $$;

-- Atualiza personas existentes para strategy
UPDATE public.personas SET type = 'strategy' WHERE type IS NULL;

-- Índice para filtros rápidos
CREATE INDEX IF NOT EXISTS personas_type_idx ON public.personas(type);

-- =====================================================
-- 2. CLASSIFICAR DOCUMENTOS (Meu vs Rival)
-- =====================================================

-- author_name: 'me' = nosso documento, qualquer outro = rival
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'me';

-- doc_type: Tipo do documento
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'government_plan';
-- Valores: 'government_plan', 'campaign_material', 'research', 'intelligence', 'other'

-- Adiciona constraint para doc_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documents_doc_type_check'
    ) THEN
        ALTER TABLE public.documents 
        ADD CONSTRAINT documents_doc_type_check 
        CHECK (doc_type IN ('government_plan', 'campaign_material', 'research', 'intelligence', 'other'));
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.documents.author_name IS 
'Nome do autor do documento. "me" = nosso candidato, qualquer outro nome = rival';

COMMENT ON COLUMN public.documents.doc_type IS 
'Tipo do documento: government_plan, campaign_material, research, intelligence, other';

-- Índices para performance
CREATE INDEX IF NOT EXISTS documents_author_name_idx ON public.documents(author_name);
CREATE INDEX IF NOT EXISTS documents_doc_type_idx ON public.documents(doc_type);

-- =====================================================
-- 3. CLASSIFICAR CHUNKS (propagar author info)
-- =====================================================

-- Adiciona author_name nos chunks para facilitar busca vetorial
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'me';

-- Índice para filtrar chunks por autor
CREATE INDEX IF NOT EXISTS document_chunks_author_name_idx ON public.document_chunks(author_name);

-- =====================================================
-- 4. TABELA: location_results (Votos por Candidato)
-- =====================================================
-- Armazena votos de TODOS candidatos em cada local
-- Permite análise de competição (quem está ganhando onde)

CREATE TABLE IF NOT EXISTS public.location_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    candidate_name TEXT NOT NULL,
    candidate_party TEXT,
    candidate_number INTEGER,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS location_results_location_id_idx 
ON public.location_results(location_id);

CREATE INDEX IF NOT EXISTS location_results_votes_idx 
ON public.location_results(votes DESC);

-- Constraint única: apenas 1 registro por candidato por local
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'location_results_unique_candidate'
    ) THEN
        CREATE UNIQUE INDEX location_results_unique_candidate
        ON public.location_results(location_id, candidate_name);
    END IF;
END $$;

-- RLS básico
ALTER TABLE public.location_results ENABLE ROW LEVEL SECURITY;

-- Política de leitura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'location_results_select_policy'
    ) THEN
        CREATE POLICY location_results_select_policy 
        ON public.location_results FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Comentário
COMMENT ON TABLE public.location_results IS 
'Armazena votos de todos os candidatos em cada local, 
para análise de competição e micro-targeting.';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO: Checar se as colunas foram criadas
-- =====================================================
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'personas' AND column_name = 'type';
-- 
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'documents' AND column_name IN ('author_name', 'doc_type');
