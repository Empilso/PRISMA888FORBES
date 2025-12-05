-- ========================================
-- CRIAÇÃO: TABELA TASKS (Kanban de Tarefas)
-- ========================================
-- Armazena tarefas executáveis criadas a partir de estratégias aprovadas

BEGIN;

-- 1. Criar ENUM para status de tarefas
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'review', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Criar ENUM para prioridade
DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Criar tabela tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    
    -- Conteúdo da tarefa
    title TEXT NOT NULL,
    description TEXT,
    
    -- Organização
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    
    -- Atribuição
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Sugestão da IA (se veio de uma estratégia)
    ai_suggestion TEXT,
    
    -- Timestamps
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.tasks IS 'Tarefas executáveis do Kanban (criadas manualmente ou a partir de estratégias aprovadas)';
COMMENT ON COLUMN public.tasks.strategy_id IS 'ID da estratégia de origem (se foi gerada pela IA)';
COMMENT ON COLUMN public.tasks.ai_suggestion IS 'Texto explicativo gerado pela IA sobre por que essa tarefa é importante';

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_campaign_id ON public.tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_strategy_id ON public.tasks(strategy_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- 5. RLS (Row Level Security)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Allow all access to tasks" ON public.tasks;

-- Política permissiva em DEV
CREATE POLICY "Allow all access to tasks" 
ON public.tasks
FOR ALL 
USING (true)
WITH CHECK (true);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Verificação final
DO $$
DECLARE
    total_tasks INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tasks FROM public.tasks;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════╗';
    RAISE NOTICE '║       ✅ TABELA TASKS CRIADA COM SUCESSO!         ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Status:';
    RAISE NOTICE '   • Tarefas existentes: %', total_tasks;
    RAISE NOTICE '   • ENUM status: pending, in_progress, review, completed';
    RAISE NOTICE '   • ENUM priority: low, medium, high, urgent';
    RAISE NOTICE '   • RLS: Habilitado';
    RAISE NOTICE '   • Trigger: update_updated_at configurado';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PRONTO PARA CRIAR O ENDPOINT DE ATIVAÇÃO!';
    RAISE NOTICE '';
END $$;

COMMIT;
