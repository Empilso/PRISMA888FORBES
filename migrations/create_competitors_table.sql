-- Cria tabela de concorrentes monitorados (Watchlist)
CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    party TEXT, -- Opcional: Partido do concorrente
    risk_level TEXT DEFAULT 'high', -- high, medium, low
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_competitors_campaign ON competitors(campaign_id);

-- Comentário
COMMENT ON TABLE competitors IS 'Lista de adversários monitorados especificamente pela campanha';
