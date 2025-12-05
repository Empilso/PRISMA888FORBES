-- 📊 MISSÃO: INTELLIGENCE - Dossiê Estratégico
-- Adiciona campo para armazenar o plano estratégico completo gerado pela AI

-- Adicionar coluna para o plano estratégico (Markdown)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS ai_strategic_plan TEXT;

-- Adicionar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_campaigns_ai_plan 
ON public.campaigns(id) 
WHERE ai_strategic_plan IS NOT NULL;

-- Comentário descritivo
COMMENT ON COLUMN public.campaigns.ai_strategic_plan IS 
'Plano estratégico completo gerado pela Genesis AI em formato Markdown. Inclui análise SWOT, narrativa central, tom de voz e cronograma macro.';

-- Verificar se funcionou
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
  AND column_name = 'ai_strategic_plan';
