-- Migration: fix_tasks_cascade.sql
-- Objetivo: Alterar FKs da tabela `tasks` para ON DELETE CASCADE e limpar registros órfãos.

BEGIN;

-- 1. Limpeza de órfãos existentes (Tasks sem Run ou sem Strategy válida)
-- Remove tasks que têm run_id mas o run não existe mais
DELETE FROM tasks 
WHERE run_id IS NOT NULL 
AND run_id NOT IN (SELECT id FROM analysis_runs);

-- Remove tasks que têm strategy_id mas a strategy não existe mais
DELETE FROM tasks 
WHERE strategy_id IS NOT NULL 
AND strategy_id NOT IN (SELECT id FROM strategies);

-- 2. Drop das Constraints antigas (SET NULL)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_run_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_strategy_id_fkey;

-- 3. Recriação com CASCADE
ALTER TABLE tasks 
ADD CONSTRAINT tasks_run_id_fkey 
FOREIGN KEY (run_id) 
REFERENCES analysis_runs(id) 
ON DELETE CASCADE;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_strategy_id_fkey 
FOREIGN KEY (strategy_id) 
REFERENCES strategies(id) 
ON DELETE CASCADE;

COMMIT;

-- Verificação final (opcional, apenas para log)
SELECT count(*) as orphans_after_cleanup 
FROM tasks 
WHERE (run_id IS NOT NULL AND run_id NOT IN (SELECT id FROM analysis_runs))
   OR (strategy_id IS NOT NULL AND strategy_id NOT IN (SELECT id FROM strategies));
