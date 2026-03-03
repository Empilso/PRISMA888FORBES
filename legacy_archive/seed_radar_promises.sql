-- ===========================================================
-- SEED: Radar de Promessas - Dados de Teste
-- ===========================================================
-- Campanha: Campanha Pivetta 2024
-- campaign_id: 8c3c03e4-1b5b-462a-841a-b5624661e5aa
-- politico_id: pivetta
-- ===========================================================

-- 1. Limpar dados anteriores de teste (idempotência)
DELETE FROM public.promise_verifications 
WHERE promise_id IN (
    SELECT id FROM public.promises 
    WHERE campaign_id = '8c3c03e4-1b5b-462a-841a-b5624661e5aa' 
    AND politico_id = 'pivetta'
);

DELETE FROM public.promises 
WHERE campaign_id = '8c3c03e4-1b5b-462a-841a-b5624661e5aa' 
AND politico_id = 'pivetta';

-- ===========================================================
-- 2. Inserir Promessas
-- ===========================================================

-- Promessa 1: Saúde - CUMPRIDA
INSERT INTO public.promises (
    id, campaign_id, politico_id, 
    resumo_promessa, categoria, origem, 
    confiabilidade, trecho_original, data_promessa,
    created_at, updated_at
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    '8c3c03e4-1b5b-462a-841a-b5624661e5aa',
    'pivetta',
    'Construir 10 novas UBS em bairros periféricos',
    'Saúde',
    'Plano de Governo',
    'ALTA',
    '"...nos primeiros 100 dias, iniciaremos a construção de 10 UBS em áreas carentes..."',
    '2024-08-15',
    now(), now()
);

-- Promessa 2: Educação - PARCIAL
INSERT INTO public.promises (
    id, campaign_id, politico_id, 
    resumo_promessa, categoria, origem, 
    confiabilidade, trecho_original, data_promessa,
    created_at, updated_at
) VALUES (
    'a2222222-2222-2222-2222-222222222222',
    '8c3c03e4-1b5b-462a-841a-b5624661e5aa',
    'pivetta',
    'Dobrar o número de vagas em creches municipais',
    'Educação',
    'Discurso de Campanha',
    'MEDIA',
    '"...minha meta é dobrar as vagas em creches nos próximos 2 anos..."',
    '2024-09-20',
    now(), now()
);

-- Promessa 3: Economia - NAO_INICIADA
INSERT INTO public.promises (
    id, campaign_id, politico_id, 
    resumo_promessa, categoria, origem, 
    confiabilidade, trecho_original, data_promessa,
    created_at, updated_at
) VALUES (
    'a3333333-3333-3333-3333-333333333333',
    '8c3c03e4-1b5b-462a-841a-b5624661e5aa',
    'pivetta',
    'Reduzir IPTU em 20% para imóveis residenciais',
    'Economia',
    'Plano de Governo',
    'ALTA',
    '"...o IPTU será reduzido em 20% já no primeiro ano de mandato..."',
    '2024-07-10',
    now(), now()
);

-- Promessa 4: Assistência Social - DESVIADA
INSERT INTO public.promises (
    id, campaign_id, politico_id, 
    resumo_promessa, categoria, origem, 
    confiabilidade, trecho_original, data_promessa,
    created_at, updated_at
) VALUES (
    'a4444444-4444-4444-4444-444444444444',
    '8c3c03e4-1b5b-462a-841a-b5624661e5aa',
    'pivetta',
    'Criar programa de renda mínima municipal',
    'Assistência Social',
    'Entrevista',
    'MEDIA',
    '"...vamos criar o Renda Cidadã, um programa de transferência de renda..."',
    '2024-10-05',
    now(), now()
);

-- ===========================================================
-- 3. Inserir Verificações
-- ===========================================================

-- Verificação 1: CUMPRIDA (Saúde)
INSERT INTO public.promise_verifications (
    id, promise_id, status,
    score_similaridade, justificativa_ia, fontes,
    data_primeira_emenda, data_licitacao, data_ultima_noticia,
    last_updated_at, created_at
) VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'CUMPRIDA',
    0.92,
    'A promessa foi verificada como CUMPRIDA com base em 3 emendas parlamentares direcionadas à construção de UBS, totalizando R$ 17 milhões. Notícias do Jornal da Cidade confirmam a inauguração de 8 unidades até a presente data.',
    '["Portal da Transparência", "Jornal da Cidade", "Diário Oficial"]'::jsonb,
    '2024-11-20',
    '2025-01-15',
    '2025-12-08',
    '2025-12-10 14:30:00',
    now()
);

-- Verificação 2: PARCIAL (Educação)
INSERT INTO public.promise_verifications (
    id, promise_id, status,
    score_similaridade, justificativa_ia, fontes,
    data_primeira_emenda, data_licitacao, data_ultima_noticia,
    last_updated_at, created_at
) VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'PARCIAL',
    0.78,
    'A promessa está PARCIALMENTE cumprida. Foi identificado aumento de 40% nas vagas, mas ainda abaixo da meta de 100%. Recursos alocados são insuficientes para atingir o objetivo completo.',
    '["Secretaria de Educação", "Portal da Transparência"]'::jsonb,
    '2025-02-10',
    NULL,
    '2025-11-15',
    '2025-12-08 10:15:00',
    now()
);

-- Verificação 3: NAO_INICIADA (Economia)
INSERT INTO public.promise_verifications (
    id, promise_id, status,
    score_similaridade, justificativa_ia, fontes,
    data_primeira_emenda, data_licitacao, data_ultima_noticia,
    last_updated_at, created_at
) VALUES (
    'b3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'NAO_INICIADA',
    0.95,
    'Nenhuma ação legislativa ou administrativa foi identificada para implementar esta promessa. Não há projetos de lei em tramitação relacionados à redução do IPTU.',
    '[]'::jsonb,
    NULL,
    NULL,
    NULL,
    '2025-12-05 08:00:00',
    now()
);

-- Verificação 4: DESVIADA (Assistência Social)
INSERT INTO public.promise_verifications (
    id, promise_id, status,
    score_similaridade, justificativa_ia, fontes,
    data_primeira_emenda, data_licitacao, data_ultima_noticia,
    last_updated_at, created_at
) VALUES (
    'b4444444-4444-4444-4444-444444444444',
    'a4444444-4444-4444-4444-444444444444',
    'DESVIADA',
    0.45,
    'A promessa foi DESVIADA. O decreto que criaria o programa foi revogado 30 dias após sua publicação. Não há perspectiva de retomada segundo fontes oficiais.',
    '["Diário Oficial", "Jornal Local"]'::jsonb,
    NULL,
    NULL,
    '2025-03-20',
    '2025-12-01 16:45:00',
    now()
);

-- ===========================================================
-- SEED COMPLETO!
-- ===========================================================
-- Total: 4 promessas + 4 verificações
-- Status: CUMPRIDA (1), PARCIAL (1), NAO_INICIADA (1), DESVIADA (1)
-- ===========================================================
