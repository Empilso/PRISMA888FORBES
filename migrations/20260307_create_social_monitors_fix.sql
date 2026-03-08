-- 20260307_create_social_monitors_fix.sql
-- Migration para criar a infraestrutura tática do Radar Social (PRISMA888)

CREATE TABLE IF NOT EXISTS public.social_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'keywords')),
    target TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'profile' CHECK (target_type IN ('profile', 'keyword', 'hashtag')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.social_monitors ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_monitors' AND policyname = 'social_monitors_all_access') THEN
        CREATE POLICY "social_monitors_all_access" ON public.social_monitors FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_social_monitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_social_monitors_updated_at ON public.social_monitors;
CREATE TRIGGER trigger_social_monitors_updated_at
    BEFORE UPDATE ON public.social_monitors
    FOR EACH ROW
    EXECUTE FUNCTION update_social_monitors_updated_at();

COMMENT ON TABLE public.social_monitors IS 'Configuração de alvos monitorados pelo motor de GeoInteligência Social (Radar Tático).';
