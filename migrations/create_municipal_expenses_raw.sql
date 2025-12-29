-- Migration: Create municipal_expenses_raw table
-- Part of TCESP Integration Phase 1
-- Stores raw API responses from TCESP municipal expenses endpoint

-- ===========================================
-- TABLE: municipal_expenses_raw
-- Raw ingestion table for TCESP API responses
-- ===========================================
CREATE TABLE IF NOT EXISTS public.municipal_expenses_raw (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    municipio_slug TEXT NOT NULL,  -- ex: "votorantim"
    ano INT NOT NULL,              -- ex: 2024
    mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),  -- 1-12
    payload JSONB NOT NULL,        -- Complete JSON array from API
    fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Unique constraint to prevent duplicate month data
CREATE UNIQUE INDEX IF NOT EXISTS idx_municipal_expenses_raw_unique 
    ON public.municipal_expenses_raw(municipio_slug, ano, mes);

-- Index for querying recent fetches
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_raw_fetched 
    ON public.municipal_expenses_raw(fetched_at DESC);

-- Index for querying by municipality
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_raw_municipio 
    ON public.municipal_expenses_raw(municipio_slug);

-- RLS (disabled for backend-only table, internal access only)
ALTER TABLE public.municipal_expenses_raw ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role (backend only)
CREATE POLICY "Service role full access" ON public.municipal_expenses_raw
    FOR ALL USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.municipal_expenses_raw IS 
    'Raw ingestion table for TCESP API municipal expenses. Not exposed to frontend.';
