-- Migration: Add tse_id to cities table
-- Purpose: Store the TSE internal city code (5 digits) for API integration
-- Reference: https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/buscar/{uf}/2024/municipios

ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS tse_id VARCHAR;

-- Index for faster lookups during import
CREATE INDEX IF NOT EXISTS idx_cities_tse_id ON public.cities(tse_id);

COMMENT ON COLUMN public.cities.tse_id IS 'Código do município na API do TSE (diferente do IBGE)';
