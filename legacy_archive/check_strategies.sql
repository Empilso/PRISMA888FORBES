-- 🔍 VERIFICAÇÃO RÁPIDA: Todas as estratégias no banco

-- Lista TUDO que existe na tabela strategies
SELECT 
    id, 
    title, 
    status, 
    campaign_id, 
    created_at,
    pillar,
    phase
FROM public.strategies
ORDER BY created_at DESC;

-- Se a tabela estiver vazia, este resultado vai vir vazio também.
-- Se tiver dados, compare o campaign_id com: ec40c3eb-85e3-452c-9b1a-e0588d068dee
