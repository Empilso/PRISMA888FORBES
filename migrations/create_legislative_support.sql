
-- Tabela para rastrear o status de apoio de vereadores em relação a uma campanha
CREATE TABLE IF NOT EXISTS legislative_support (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    politician_id UUID NOT NULL REFERENCES politicians(id) ON DELETE CASCADE, -- O vereador
    status TEXT NOT NULL CHECK (status IN ('base', 'oposicao', 'neutro')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, politician_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_legislative_support_campaign ON legislative_support(campaign_id);
CREATE INDEX IF NOT EXISTS idx_legislative_support_politician ON legislative_support(politician_id);

-- RLS (Row Level Security)
ALTER TABLE legislative_support ENABLE ROW LEVEL SECURITY;

-- Política de acesso (simplificada para dev: permite tudo para authenticated)
CREATE POLICY "Allow all for authenticated" ON legislative_support
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
