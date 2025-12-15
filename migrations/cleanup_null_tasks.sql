-- Cleanup: cleanup_null_tasks.sql
-- Objetivo: Remover TODAS as tarefas que não possuem vínculo com Run ou Strategy (fantasmas de deleções passadas com SET NULL).

BEGIN;

DELETE FROM tasks 
WHERE run_id IS NULL 
   OR strategy_id IS NULL;

COMMIT;

-- Verificação
SELECT count(*) as remaining_tasks FROM tasks;
