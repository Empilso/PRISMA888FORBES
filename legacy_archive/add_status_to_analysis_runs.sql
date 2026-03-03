-- Migration: Adicionar coluna 'status' à tabela analysis_runs
-- Necessário para o sistema de telemetria

BEGIN;

-- Adicionar coluna status se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_runs' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.analysis_runs 
        ADD COLUMN status TEXT DEFAULT 'running';
        
        -- Atualizar runs existentes para 'completed'
        UPDATE public.analysis_runs 
        SET status = 'completed' 
        WHERE status IS NULL;
    END IF;
END $$;

-- Criar índice para otimizar queries por status
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON public.analysis_runs(status);

COMMIT;

-- Valores possíveis para status:
-- 'running'   - Execução em andamento
-- 'completed' - Execução finalizada com sucesso
-- 'failed'    - Execução falhou com erro
