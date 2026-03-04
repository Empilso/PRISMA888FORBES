-- Create social_mentions table to store Instagram and TikTok data for AIOS Geo-Social engine
CREATE TABLE IF NOT EXISTS public.social_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
    text TEXT NOT NULL,
    author_username TEXT NOT NULL,
    post_url TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    sentiment_label TEXT CHECK (sentiment_label IN ('Positivo', 'Negativo', 'Neutro')),
    target_type TEXT NOT NULL CHECK (target_type IN ('rival', 'own')),
    rival_handle TEXT,
    inferred_neighborhood TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.social_mentions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Enable read access for authenticated users"
ON public.social_mentions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON public.social_mentions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
ON public.social_mentions
FOR DELETE
TO authenticated
USING (true);

-- Criar índices de performance (importante para buscas geográficas em mapas)
CREATE INDEX IF NOT EXISTS social_mentions_campaign_idx ON public.social_mentions (campaign_id);
CREATE INDEX IF NOT EXISTS social_mentions_lat_lng_idx ON public.social_mentions (lat, lng);
