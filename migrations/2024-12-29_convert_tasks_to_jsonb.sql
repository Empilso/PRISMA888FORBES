-- ============================================================
-- MIGRATION: Converter tags/examples de TEXT[] para JSONB
-- Data: 2024-12-29
-- Cenário: B (conversão sem perda de dados)
-- IDEMPOTENTE: Pode rodar múltiplas vezes sem erro
-- ============================================================
-- O QUE ESTE SQL FAZ (5 bullets):
-- 1. Cria colunas temporárias JSONB (tags_jsonb, examples_jsonb) SE não existirem
-- 2. Copia dados convertidos de TEXT[] para JSONB (só se origem existir)
-- 3. Renomeia colunas TEXT[] para backup (só se ainda não foram renomeadas)
-- 4. Renomeia colunas JSONB para nomes finais (só se existirem)
-- 5. Define defaults '[]'::jsonb
-- ============================================================

-- PRE-CHECK: Ver estado antes
SELECT 'PRE-CHECK' as step, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='tasks'
AND column_name IN ('tags','examples','tags_jsonb','examples_jsonb','tags_text_backup','examples_text_backup');

-- STEP 1: Criar colunas temporárias JSONB (IF NOT EXISTS)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tags_jsonb JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS examples_jsonb JSONB DEFAULT '[]'::jsonb;

-- STEP 2: Converter dados (só se colunas TEXT[] originais ainda existem)
DO $$
BEGIN
    -- Converter tags se ainda for TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='tags' AND udt_name='_text'
    ) THEN
        UPDATE public.tasks
        SET tags_jsonb = COALESCE(to_jsonb(tags), '[]'::jsonb)
        WHERE tags IS NOT NULL;
        RAISE NOTICE 'tags convertido para JSONB';
    END IF;

    -- Converter examples se ainda for TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='examples' AND udt_name='_text'
    ) THEN
        UPDATE public.tasks
        SET examples_jsonb = COALESCE(to_jsonb(examples), '[]'::jsonb)
        WHERE examples IS NOT NULL;
        RAISE NOTICE 'examples convertido para JSONB';
    END IF;
END $$;

-- STEP 3: Renomear TEXT[] para backup (só se ainda não foi feito)
DO $$
BEGIN
    -- Renomear tags se ainda for TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='tags' AND udt_name='_text'
    ) THEN
        ALTER TABLE public.tasks RENAME COLUMN tags TO tags_text_backup;
        RAISE NOTICE 'tags renomeado para tags_text_backup';
    END IF;

    -- Renomear examples se ainda for TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='examples' AND udt_name='_text'
    ) THEN
        ALTER TABLE public.tasks RENAME COLUMN examples TO examples_text_backup;
        RAISE NOTICE 'examples renomeado para examples_text_backup';
    END IF;
END $$;

-- STEP 4: Renomear _jsonb para nomes finais (só se tags_jsonb existe e tags não existe como JSONB)
DO $$
BEGIN
    -- Finalizar tags
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='tags_jsonb'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='tags' AND udt_name='jsonb'
    ) THEN
        ALTER TABLE public.tasks RENAME COLUMN tags_jsonb TO tags;
        RAISE NOTICE 'tags_jsonb renomeado para tags';
    END IF;

    -- Finalizar examples
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='examples_jsonb'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='examples' AND udt_name='jsonb'
    ) THEN
        ALTER TABLE public.tasks RENAME COLUMN examples_jsonb TO examples;
        RAISE NOTICE 'examples_jsonb renomeado para examples';
    END IF;
END $$;

-- STEP 5: Garantir defaults (só se coluna existe como JSONB)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='tags' AND udt_name='jsonb'
    ) THEN
        ALTER TABLE public.tasks ALTER COLUMN tags SET DEFAULT '[]'::jsonb;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='tasks' 
        AND column_name='examples' AND udt_name='jsonb'
    ) THEN
        ALTER TABLE public.tasks ALTER COLUMN examples SET DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- POST-CHECK: Ver estado final
SELECT 'POST-CHECK' as step, column_name, data_type, udt_name, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='tasks'
AND column_name IN ('tags','examples','tags_text_backup','examples_text_backup');

-- ============================================================
-- APÓS CONFIRMAR QUE TUDO FUNCIONA (opcional, em sessão futura):
-- DROP das colunas de backup:
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS tags_text_backup;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS examples_text_backup;
-- ============================================================
