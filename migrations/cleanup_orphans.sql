-- Cleanup: cleanup_orphans.sql
-- Objetivo: Remover dados órfãos em tabelas que não possuem FK com CASCADE.
-- Tabelas afetadas: ai_analysis_results, electoral_data_raw.

BEGIN;

-- 1. Limpar Resultados de Análise órfãos
DELETE FROM ai_analysis_results 
WHERE candidate_id IS NOT NULL 
AND candidate_id NOT IN (SELECT id FROM campaigns);

-- 2. Limpar Dados Eleitorais Brutos órfãos
DELETE FROM electoral_data_raw 
WHERE candidate_id IS NOT NULL 
AND candidate_id NOT IN (SELECT id FROM campaigns);

COMMIT;

-- Verificação
SELECT 
    (SELECT count(*) FROM ai_analysis_results) as remaining_ai_results,
    (SELECT count(*) FROM electoral_data_raw) as remaining_electoral_data;
