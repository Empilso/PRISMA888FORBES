-- Migration: Create suppliers and junction tables
-- Part of TCESP Integration - Supplier Normalization
-- Creates normalized supplier registry linked to municipal expenses

-- ===========================================
-- TABLE: suppliers
-- Normalized supplier (fornecedor) registry
-- ===========================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_id_fornecedor TEXT NOT NULL,  -- Full original string from TCESP
    documento TEXT,                    -- Extracted CNPJ (14 digits) or CPF (11 digits)
    tipo TEXT,                         -- "CNPJ_PJ", "CPF_PF", "OUTRO"
    nome TEXT,                         -- Supplier name from nm_fornecedor
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on raw identifier
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_raw_id_fornecedor_key
    ON public.suppliers (raw_id_fornecedor);

-- Index for document lookups
CREATE INDEX IF NOT EXISTS suppliers_documento_idx
    ON public.suppliers (documento);

-- Index for name searches
CREATE INDEX IF NOT EXISTS suppliers_nome_idx
    ON public.suppliers (nome);

-- RLS (backend-only table)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on suppliers" ON public.suppliers
    FOR ALL USING (true);

-- ===========================================
-- TABLE: municipal_expenses_suppliers
-- Junction table linking expenses to suppliers
-- ===========================================
CREATE TABLE IF NOT EXISTS public.municipal_expenses_suppliers (
    expense_id UUID NOT NULL REFERENCES public.municipal_expenses (id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
    PRIMARY KEY (expense_id, supplier_id)
);

-- Index for supplier lookups
CREATE INDEX IF NOT EXISTS mes_supplier_id_idx
    ON public.municipal_expenses_suppliers (supplier_id);

-- RLS (backend-only table)
ALTER TABLE public.municipal_expenses_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on mes" ON public.municipal_expenses_suppliers
    FOR ALL USING (true);

-- ===========================================
-- Trigger for updated_at on suppliers
-- ===========================================
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trigger_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

-- Documentation
COMMENT ON TABLE public.suppliers IS 
    'Normalized supplier registry extracted from TCESP municipal expenses data';

COMMENT ON TABLE public.municipal_expenses_suppliers IS 
    'Junction table linking municipal_expenses to suppliers (many-to-many)';
