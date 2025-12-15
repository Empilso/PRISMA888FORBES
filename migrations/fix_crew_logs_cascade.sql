-- Migration: fix_crew_logs_cascade.sql
-- Objetivo: Alterar FK da tabela crew_run_logs para ON DELETE CASCADE
-- Isso permite deletar uma campanha e remover automaticamente seus logs de execução.

BEGIN;

-- 1. Drop da Constraint antiga (NO ACTION)
ALTER TABLE crew_run_logs DROP CONSTRAINT IF EXISTS crew_run_logs_campaign_id_fkey;

-- 2. Recriação com CASCADE
ALTER TABLE crew_run_logs 
ADD CONSTRAINT crew_run_logs_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES campaigns(id) 
ON DELETE CASCADE;

COMMIT;

-- Verificação (apenas para debug manual se necessário)
-- SELECT * FROM information_schema.referential_constraints WHERE constraint_name = 'crew_run_logs_campaign_id_fkey';
