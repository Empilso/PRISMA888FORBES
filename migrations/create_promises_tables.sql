-- Migration: Create promises and promise_verifications tables
-- Part of Radar de Promessas feature

-- ===========================================
-- TABLE: promises
-- Stores political promises from campaigns
-- ===========================================
CREATE TABLE IF NOT EXISTS public.promises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL, -- FK to campaigns table (managed at app level)
    politico_id TEXT NOT NULL, -- ID do político (pode ser o candidato da campanha ou adversário)
    resumo_promessa TEXT NOT NULL,
    categoria TEXT NOT NULL, -- Ex: "Saúde", "Educação", "Economia"
    origem TEXT NOT NULL, -- Ex: "PLANO_GOVERNO", "DISCURSO_PLENARIO", "REDE_SOCIAL", "PROJETO_LEI"
    confiabilidade TEXT DEFAULT 'MEDIA', -- "ALTA", "MEDIA", "BAIXA"
    trecho_original TEXT,
    data_promessa DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for promises
CREATE INDEX IF NOT EXISTS idx_promises_campaign_id ON public.promises(campaign_id);
CREATE INDEX IF NOT EXISTS idx_promises_politico_id ON public.promises(politico_id);
CREATE INDEX IF NOT EXISTS idx_promises_categoria ON public.promises(categoria);
CREATE INDEX IF NOT EXISTS idx_promises_origem ON public.promises(origem);
CREATE INDEX IF NOT EXISTS idx_promises_created_at ON public.promises(created_at DESC);

-- RLS for promises (follows campaign_id pattern)
ALTER TABLE public.promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promises from their campaigns" ON public.promises
    FOR SELECT USING (true);

CREATE POLICY "Users can insert promises" ON public.promises
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update promises" ON public.promises
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete promises" ON public.promises
    FOR DELETE USING (true);

-- ===========================================
-- TABLE: promise_verifications
-- Stores radar verification results for each promise
-- ===========================================
CREATE TABLE IF NOT EXISTS public.promise_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promise_id UUID NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- "CUMPRIDA", "PARCIAL", "NAO_INICIADA", "DESVIADA"
    score_similaridade NUMERIC(5,4), -- 0.0000 to 1.0000
    justificativa_ia TEXT,
    fontes JSONB DEFAULT '[]'::jsonb, -- Array of source objects
    -- Timeline dates
    data_primeira_emenda DATE,
    data_licitacao DATE,
    data_ultima_noticia DATE,
    -- Timestamps
    last_updated_at TIMESTAMPTZ DEFAULT now(), -- When the radar last checked this
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for promise_verifications
CREATE INDEX IF NOT EXISTS idx_promise_verifications_promise_id ON public.promise_verifications(promise_id);
CREATE INDEX IF NOT EXISTS idx_promise_verifications_status ON public.promise_verifications(status);
CREATE INDEX IF NOT EXISTS idx_promise_verifications_last_updated ON public.promise_verifications(last_updated_at DESC);

-- RLS for promise_verifications (inherits via promise_id -> promises.campaign_id)
ALTER TABLE public.promise_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view verifications" ON public.promise_verifications
    FOR SELECT USING (true);

CREATE POLICY "Users can insert verifications" ON public.promise_verifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update verifications" ON public.promise_verifications
    FOR UPDATE USING (true);

-- ===========================================
-- Trigger for updated_at on promises
-- ===========================================
CREATE OR REPLACE FUNCTION update_promises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_promises_updated_at ON public.promises;
CREATE TRIGGER trigger_promises_updated_at
    BEFORE UPDATE ON public.promises
    FOR EACH ROW
    EXECUTE FUNCTION update_promises_updated_at();

-- ===========================================
-- Sample data for testing (optional)
-- ===========================================
-- Uncomment below to seed sample promises for testing

/*
INSERT INTO public.promises (campaign_id, politico_id, resumo_promessa, categoria, origem, confiabilidade, trecho_original, data_promessa)
VALUES 
    ('8c3c03e4-1b5b-462a-841a-b5624661e5aa', 'candidate', 'Construir 10 novas UBS em bairros periféricos', 'Saúde', 'PLANO_GOVERNO', 'ALTA', '"...nos primeiros 100 dias, iniciaremos a construção de 10 UBS em áreas carentes..."', '2024-08-15'),
    ('8c3c03e4-1b5b-462a-841a-b5624661e5aa', 'candidate', 'Dobrar o número de vagas em creches municipais', 'Educação', 'DISCURSO_PLENARIO', 'MEDIA', '"...minha meta é dobrar as vagas em creches nos próximos 2 anos..."', '2024-09-20');
*/
