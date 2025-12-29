-- ===========================================================
-- Migration: Radar Premium - Offices, Mandates, Executions
-- ===========================================================

-- ===========================================================
-- 1. Tabela: offices (Cargos Políticos)
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    level TEXT DEFAULT 'municipal' CHECK (level IN ('municipal', 'estadual', 'federal')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed de cargos padrão
INSERT INTO public.offices (name, slug, level) VALUES
    ('Prefeito', 'prefeito', 'municipal'),
    ('Vice-Prefeito', 'vice-prefeito', 'municipal'),
    ('Vereador', 'vereador', 'municipal'),
    ('Secretário Municipal', 'secretario-municipal', 'municipal'),
    ('Governador', 'governador', 'estadual'),
    ('Deputado Estadual', 'deputado-estadual', 'estadual'),
    ('Deputado Federal', 'deputado-federal', 'federal'),
    ('Senador', 'senador', 'federal')
ON CONFLICT (slug) DO NOTHING;

-- RLS
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offices' AND policyname = 'Offices public read') THEN
        CREATE POLICY "Offices public read" ON public.offices FOR SELECT USING (true);
    END IF;
END $$;

-- ===========================================================
-- 2. Tabela: mandates (Mandatos)
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    campaign_id UUID,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraint: único mandato ativo por pessoa/cargo/cidade
    CONSTRAINT unique_active_mandate UNIQUE (politician_id, office_id, city_id, is_active)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mandates_politician ON public.mandates(politician_id);
CREATE INDEX IF NOT EXISTS idx_mandates_office ON public.mandates(office_id);
CREATE INDEX IF NOT EXISTS idx_mandates_city ON public.mandates(city_id);
CREATE INDEX IF NOT EXISTS idx_mandates_campaign ON public.mandates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mandates_active ON public.mandates(is_active);

-- RLS
ALTER TABLE public.mandates ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mandates' AND policyname = 'Mandates public read') THEN
        CREATE POLICY "Mandates public read" ON public.mandates FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mandates' AND policyname = 'Mandates service write') THEN
        CREATE POLICY "Mandates service write" ON public.mandates FOR ALL USING (true);
    END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_mandates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mandates_updated_at ON public.mandates;
CREATE TRIGGER trigger_mandates_updated_at
    BEFORE UPDATE ON public.mandates
    FOR EACH ROW
    EXECUTE FUNCTION update_mandates_updated_at();

-- ===========================================================
-- 3. Tabela: radar_executions (Logs de Execução do Radar)
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.radar_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('phase1', 'phase2', 'phase3', 'verify')),
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'error')),
    started_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ,
    summary JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_radar_exec_campaign ON public.radar_executions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_radar_exec_mandate ON public.radar_executions(mandate_id);
CREATE INDEX IF NOT EXISTS idx_radar_exec_phase ON public.radar_executions(phase);
CREATE INDEX IF NOT EXISTS idx_radar_exec_status ON public.radar_executions(status);
CREATE INDEX IF NOT EXISTS idx_radar_exec_started ON public.radar_executions(started_at DESC);

-- RLS
ALTER TABLE public.radar_executions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'radar_executions' AND policyname = 'Radar exec public read') THEN
        CREATE POLICY "Radar exec public read" ON public.radar_executions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'radar_executions' AND policyname = 'Radar exec service write') THEN
        CREATE POLICY "Radar exec service write" ON public.radar_executions FOR ALL USING (true);
    END IF;
END $$;

-- ===========================================================
-- 4. Adicionar mandate_id na tabela promises (opcional)
-- ===========================================================

ALTER TABLE public.promises ADD COLUMN IF NOT EXISTS mandate_id UUID REFERENCES public.mandates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_promises_mandate ON public.promises(mandate_id);

-- ===========================================================
-- MIGRATION COMPLETA!
-- ===========================================================
