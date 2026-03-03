-- 🤖 HUB MULTI-MODELO: Adiciona campo para seleção de LLM
-- Permite que cada Persona use um modelo diferente (GPT-4, Grok, DeepSeek, etc.)

-- Adicionar coluna llm_model
ALTER TABLE public.personas 
ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'gpt-4o-mini';

-- Comentário descritivo
COMMENT ON COLUMN public.personas.llm_model IS 
'Modelo LLM utilizado por esta persona. Formato: "gpt-4o-mini" ou "openrouter/x-ai/grok-beta"';

-- Set default para personas existentes
UPDATE public.personas 
SET llm_model = 'gpt-4o-mini' 
WHERE llm_model IS NULL;

-- Verificar
SELECT name, llm_model, is_active 
FROM public.personas;
