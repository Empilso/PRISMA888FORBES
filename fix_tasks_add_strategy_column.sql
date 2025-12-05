-- ========================================
-- CORREÇÃO: ADICIONAR COLUNAS FALTANTES NA TABELA TASKS
-- ========================================
-- A tabela tasks já existe, mas faltam colunas críticas para a integração com IA

BEGIN;

-- 1. Garantir que os ENUMs existem
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'review', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar coluna strategy_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tasks' 
          AND column_name = 'strategy_id'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Coluna strategy_id adicionada';
    END IF;
END $$;

-- 3. Adicionar coluna ai_suggestion
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tasks' 
          AND column_name = 'ai_suggestion'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN ai_suggestion TEXT;
        
        RAISE NOTICE '✅ Coluna ai_suggestion adicionada';
    END IF;
END $$;

-- 4. Adicionar coluna tags se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tasks' 
          AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN tags TEXT[] DEFAULT '{}';
        
        RAISE NOTICE '✅ Coluna tags adicionada';
    END IF;
END $$;

-- 5. Adicionar coluna priority se não existir (e converter se necessário)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tasks' 
          AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN priority task_priority DEFAULT 'medium';
        RAISE NOTICE '✅ Coluna priority adicionada';
    END IF;
END $$;

-- 6. Adicionar coluna status se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tasks' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN status task_status DEFAULT 'pending';
        RAISE NOTICE '✅ Coluna status adicionada';
    END IF;
END $$;

-- 7. Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_tasks_strategy_id ON public.tasks(strategy_id);

-- 8. Verificação final
DO $$
DECLARE
    cols_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cols_count 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name IN ('strategy_id', 'ai_suggestion', 'tags');
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════╗';
    RAISE NOTICE '║      ✅ TABELA TASKS CORRIGIDA COM SUCESSO!       ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════╝';
    RAISE NOTICE '   • Colunas verificadas/adicionadas: strategy_id, ai_suggestion, tags';
    RAISE NOTICE '   • Índices criados';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 AGORA O ENDPOINT DE ATIVAÇÃO VAI FUNCIONAR!';
    RAISE NOTICE '';
END $$;

COMMIT;
