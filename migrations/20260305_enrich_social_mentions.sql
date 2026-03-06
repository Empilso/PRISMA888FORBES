-- Fase 14: Enriquecer social_mentions com dados reais do Apify
-- Adicionar colunas para visibilidade completa por perfil

ALTER TABLE public.social_mentions ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.social_mentions ADD COLUMN IF NOT EXISTS comment_id TEXT;
ALTER TABLE public.social_mentions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'apify';

-- Permitir service_role inserir sem RLS (para o backend)
CREATE POLICY IF NOT EXISTS "Enable service_role full access"
ON public.social_mentions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
