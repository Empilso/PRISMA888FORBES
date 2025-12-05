BEGIN;

-- 🧹 LIMPEZA: Remove a tabela se ela existir (para corrigir o erro de criação incompleta)
DROP TABLE IF EXISTS public.analysis_runs CASCADE;

-- 1. Criar tabela de Histórico de Execuções (DO ZERO)
CREATE TABLE public.analysis_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    persona_name TEXT,
    llm_model TEXT,
    strategic_plan_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Índices
CREATE INDEX idx_analysis_runs_campaign ON public.analysis_runs(campaign_id);
CREATE INDEX idx_analysis_runs_created_at ON public.analysis_runs(created_at DESC);

-- 3. Comentários
COMMENT ON TABLE public.analysis_runs IS 'Histórico de execuções da Genesis AI';

-- 4. RLS
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin pode ver runs" ON public.analysis_runs FOR ALL USING (auth.role() = 'authenticated');

-- 5. Adicionar vínculo nas estratégias (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategies' AND column_name = 'run_id') THEN
        ALTER TABLE public.strategies ADD COLUMN run_id UUID REFERENCES public.analysis_runs(id) ON DELETE CASCADE;
        CREATE INDEX idx_strategies_run_id ON public.strategies(run_id);
    END IF;
END $$;

COMMIT;
