-- Migration: setup_full_cascade_cleanup.sql
-- Objetivo: Garantir que ai_analysis_results e electoral_data_raw sejam deletados automaticamente
-- quando a campanha (candidate_id) for removida.

BEGIN;

-- 1. Adicionar FK em ai_analysis_results
-- Primeiro removemos qualquer constraint antiga se existir (embora tenhamos visto que não há)
ALTER TABLE ai_analysis_results 
DROP CONSTRAINT IF EXISTS ai_analysis_results_candidate_id_fkey;

ALTER TABLE ai_analysis_results
ADD CONSTRAINT ai_analysis_results_candidate_id_fkey
FOREIGN KEY (candidate_id)
REFERENCES campaigns(id)
ON DELETE CASCADE;

-- 2. Adicionar FK em electoral_data_raw
ALTER TABLE electoral_data_raw
DROP CONSTRAINT IF EXISTS electoral_data_raw_candidate_id_fkey;

ALTER TABLE electoral_data_raw
ADD CONSTRAINT electoral_data_raw_candidate_id_fkey
FOREIGN KEY (candidate_id)
REFERENCES campaigns(id)
ON DELETE CASCADE;

COMMIT;
