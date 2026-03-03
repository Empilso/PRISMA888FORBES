-- 1. Verter para a nova estrutura de target_type
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_target_type') THEN
        CREATE TYPE social_target_type AS ENUM ('profile', 'keyword', 'hashtag');
    END IF;
END $$;

-- 2. Adicionar coluna target_type se nao existir (ou usar a existente se ja migramos antes)
ALTER TABLE public.social_monitors 
ADD COLUMN IF NOT EXISTS target_type social_target_type DEFAULT 'profile';

-- 3. Renomear handle para target para maior generalidade
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_monitors' AND column_name='handle') THEN
        ALTER TABLE public.social_monitors RENAME COLUMN handle TO target;
    END IF;
END $$;

-- 4. Garantir que query_term reflita o target se for novo
UPDATE public.social_monitors SET query_term = target WHERE query_term IS NULL;
