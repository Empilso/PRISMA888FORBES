-- 20260307_fix_task_history_user_id.sql
-- Essa migração corrige o bug ao deletar um candidato.
-- Quando o Admin exclui uma campanha, o backend usa a chave 'service_role' (não há usuário logado).
-- As tarefas são excluídas, e um gatilho/log de histórico tenta salvar a exclusão na 'task_history'.
-- Como não há usuário logado, o valor passado é NULL, e a coluna exigia NOT NULL.
-- A solução (macro) é permitir que o histórico tenha ações de sistema (user_id nulo).

ALTER TABLE public.task_history ALTER COLUMN user_id DROP NOT NULL;

-- Já vamos aproveitar para garantir que a task_comments também suporte.
ALTER TABLE public.task_comments ALTER COLUMN profile_id DROP NOT NULL;
