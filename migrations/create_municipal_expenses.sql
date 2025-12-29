-- Migration: Create municipal_expenses normalized table
-- Part of TCESP Integration Phase 2
-- Stores normalized, analytics-ready municipal expense records

-- ===========================================
-- TABLE: municipal_expenses
-- Normalized expense records from TCESP data
-- ===========================================
CREATE TABLE IF NOT EXISTS public.municipal_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    municipio_slug TEXT NOT NULL,
    ano INT NOT NULL,
    mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
    orgao TEXT NOT NULL,
    evento TEXT NOT NULL,  -- "Empenhado", "Liquidado", "Pago", etc.
    nr_empenho TEXT NOT NULL,
    id_fornecedor TEXT,
    nm_fornecedor TEXT,
    dt_emissao_despesa DATE,
    vl_despesa NUMERIC(15,2),  -- Converted from string "9999,99" to 9999.99
    raw_hash TEXT NOT NULL,    -- Hash to prevent duplicates
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Unique constraint on hash to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_municipal_expenses_raw_hash 
    ON public.municipal_expenses(raw_hash);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_municipio_periodo 
    ON public.municipal_expenses(municipio_slug, ano, mes);

-- Index for filtering by orgao
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_orgao 
    ON public.municipal_expenses(orgao);

-- Index for filtering by evento
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_evento 
    ON public.municipal_expenses(evento);

-- Index for supplier searches
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_fornecedor 
    ON public.municipal_expenses(nm_fornecedor);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_data 
    ON public.municipal_expenses(dt_emissao_despesa);

-- Index for value-based queries (top expenses)
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_valor 
    ON public.municipal_expenses(vl_despesa DESC);

-- RLS (backend-only table for now)
ALTER TABLE public.municipal_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.municipal_expenses
    FOR ALL USING (true);

-- Documentation
COMMENT ON TABLE public.municipal_expenses IS 
    'Normalized municipal expenses from TCESP API. Analytics-ready format.';

COMMENT ON COLUMN public.municipal_expenses.raw_hash IS 
    'MD5 hash of key fields to prevent duplicate inserts';

COMMENT ON COLUMN public.municipal_expenses.vl_despesa IS 
    'Expense value converted from BR format (9.999,99) to numeric';
