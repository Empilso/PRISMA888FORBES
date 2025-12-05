-- MISSÃO 42: Sistema de Telemetria - Tabela de Logs
-- Execute este SQL no Supabase Dashboard (SQL Editor)

BEGIN;

-- Tabela de Logs de Execução
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id UUID, -- Vincula à execução específica (analysis_runs.id)
    campaign_id UUID,
    agent_name TEXT, -- Ex: "Analista", "Estrategista", "System"
    message TEXT,    -- Ex: "Lendo PDF...", "Definindo pilares..."
    status TEXT,     -- 'info', 'success', 'error', 'warning'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_agent_logs_run_id ON public.agent_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_campaign_id ON public.agent_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (permitir para todos autenticados)
DROP POLICY IF EXISTS "Ver logs" ON public.agent_logs;
CREATE POLICY "Ver logs" ON public.agent_logs 
    FOR SELECT 
    USING (true);

-- Policy para inserção (backend pode inserir)
DROP POLICY IF EXISTS "Inserir logs" ON public.agent_logs;
CREATE POLICY "Inserir logs" ON public.agent_logs 
    FOR INSERT 
    WITH CHECK (true);

COMMIT;

-- IMPORTANTE: Habilitar Realtime para esta tabela no Dashboard:
-- 1. Vá em Database > Replication
-- 2. Adicione a tabela "agent_logs" à publicação "supabase_realtime"
-- OU execute:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_logs;
