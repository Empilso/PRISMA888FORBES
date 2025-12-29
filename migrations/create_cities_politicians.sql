-- ===========================================================
-- Migration: Cadastro de Cidades e Políticos
-- ===========================================================

-- ===========================================================
-- 1. Tabela: cities (Cidades)
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    state TEXT NOT NULL CHECK (length(state) = 2),
    ibge_code TEXT UNIQUE,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cities_slug ON public.cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_state ON public.cities(state);
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);

-- RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cities' AND policyname = 'Cities public read') THEN
        CREATE POLICY "Cities public read" ON public.cities FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cities' AND policyname = 'Cities service write') THEN
        CREATE POLICY "Cities service write" ON public.cities FOR ALL USING (true);
    END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cities_updated_at ON public.cities;
CREATE TRIGGER trigger_cities_updated_at
    BEFORE UPDATE ON public.cities
    FOR EACH ROW
    EXECUTE FUNCTION update_cities_updated_at();

-- ===========================================================
-- 2. Tabela: politicians (Políticos)
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.politicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    campaign_id UUID,
    tipo TEXT DEFAULT 'prefeito' CHECK (tipo IN ('prefeito', 'vereador', 'deputado_estadual', 'deputado_federal', 'senador', 'governador', 'outro')),
    slug TEXT UNIQUE NOT NULL,
    partido TEXT,
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_politicians_slug ON public.politicians(slug);
CREATE INDEX IF NOT EXISTS idx_politicians_city_id ON public.politicians(city_id);
CREATE INDEX IF NOT EXISTS idx_politicians_campaign_id ON public.politicians(campaign_id);
CREATE INDEX IF NOT EXISTS idx_politicians_tipo ON public.politicians(tipo);
CREATE INDEX IF NOT EXISTS idx_politicians_partido ON public.politicians(partido);

-- RLS
ALTER TABLE public.politicians ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'politicians' AND policyname = 'Politicians public read') THEN
        CREATE POLICY "Politicians public read" ON public.politicians FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'politicians' AND policyname = 'Politicians service write') THEN
        CREATE POLICY "Politicians service write" ON public.politicians FOR ALL USING (true);
    END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_politicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_politicians_updated_at ON public.politicians;
CREATE TRIGGER trigger_politicians_updated_at
    BEFORE UPDATE ON public.politicians
    FOR EACH ROW
    EXECUTE FUNCTION update_politicians_updated_at();

-- ===========================================================
-- MIGRATION COMPLETA!
-- ===========================================================
-- Tabelas criadas:
--   - public.cities (cidades)
--   - public.politicians (políticos)
-- ===========================================================
