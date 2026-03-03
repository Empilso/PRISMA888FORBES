-- ============================================================================
-- MIGRATION: Social Radar - Monitor Tático Social
-- PRISMA888 v11 - GeoInteligência Social
-- ============================================================================

-- 1. Adicionar coluna social_links à tabela campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

COMMENT ON COLUMN campaigns.social_links IS 'Links de redes sociais dos adversários para monitoramento. Formato: {"instagram": ["@handle1"], "tiktok": ["@handle2"]}';

-- 2. Criar tabela social_mentions
CREATE TABLE IF NOT EXISTS social_mentions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
    author VARCHAR(255),
    text TEXT NOT NULL,
    sentiment INTEGER CHECK (sentiment BETWEEN 1 AND 5),
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('Positivo', 'Negativo', 'Neutro')),
    inferred_neighborhood VARCHAR(255),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    source_url TEXT,
    rival_handle VARCHAR(255),
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    is_mock BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_social_mentions_campaign ON social_mentions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_mentions_neighborhood ON social_mentions(inferred_neighborhood);
CREATE INDEX IF NOT EXISTS idx_social_mentions_sentiment ON social_mentions(sentiment_label);

-- RLS (Row Level Security)
ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_mentions_all_access" ON social_mentions
    FOR ALL USING (true) WITH CHECK (true);