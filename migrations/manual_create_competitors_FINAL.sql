-- CRIAÇÃO DA TABELA DE CONCORRENTES (ENTERPRISE RADAR)
-- Rode este script no SQL Editor do seu projeto Supabase (gsm... ou o que o frontend usa)

CREATE TABLE IF NOT EXISTS public.competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    party TEXT,
    risk_level TEXT DEFAULT 'high', -- high, medium, low
    color TEXT DEFAULT '#EF4444',   -- Cor para o Mapa
    avatar_url TEXT,                -- Opcional
    notes TEXT,                     -- Opcional
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para garantir performance nas buscas do radar
CREATE INDEX IF NOT EXISTS idx_competitors_campaign ON public.competitors(campaign_id);

-- Permissões (RLS) - Garante que o usuario autenticado possa ler/escrever
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

-- Política simples: Usuário autenticado pode fazer tudo (ajuste conforme necessidade)
CREATE POLICY "Users can manage their campaign competitors" 
ON public.competitors
FOR ALL 
USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.competitors IS 'Lista de adversários monitorados para o Radar de Ameaças';
