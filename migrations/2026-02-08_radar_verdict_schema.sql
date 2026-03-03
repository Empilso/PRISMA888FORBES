-- Migration: Add extra columns for Radar Verdict (Triangulation)
-- Target Table: promise_verifications

ALTER TABLE public.promise_verifications 
ADD COLUMN IF NOT EXISTS evidence_sources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,2);

COMMENT ON COLUMN public.promise_verifications.evidence_sources IS 'Fontes e trechos de evidência fiscal e midiática';
COMMENT ON COLUMN public.promise_verifications.confidence_score IS 'Pontuação de confiança da IA no veredito (0-100)';
