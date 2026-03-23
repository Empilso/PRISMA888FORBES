-- Migration QI220: Suporte ao Extrator Forense de Entidades
-- Adiciona coluna JSONB para armazenar metadados extraídos de texto livre

-- 1. Tabela de Emendas (campos: objeto_detalhado, descricao_loa)
ALTER TABLE parliamentary_amendments
ADD COLUMN IF NOT EXISTS entidades_extraidas JSONB DEFAULT '{}';

-- 2. Tabela de Pagamentos (campos: historico, descricao_pagamento)
ALTER TABLE amendment_payments
ADD COLUMN IF NOT EXISTS entidades_extraidas JSONB DEFAULT '{}';

-- Comentários para documentação
COMMENT ON COLUMN parliamentary_amendments.entidades_extraidas IS 'Entidades forenses extraídas (Contratos, NFs, Processos, Municípios) via Regex/NER.';
COMMENT ON COLUMN amendment_payments.entidades_extraidas IS 'Entidades forenses extraídas (Contratos, NFs, Processos) a partir do histórico de pagamento.';
