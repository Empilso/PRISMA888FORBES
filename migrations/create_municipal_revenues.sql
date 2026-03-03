-- Migration: Create municipal_revenues table
-- Mirror structure from TCE-SP Receitas data
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS public.municipal_revenues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação do Município
    municipio_slug TEXT NOT NULL,
    municipio_nome TEXT,
    exercicio INTEGER NOT NULL DEFAULT 2025,
    
    -- Classificação da Receita
    rubrica TEXT, -- Ex: "13210000 - Juros e Correções Monetárias"
    fonte_receita TEXT, -- Descrição da fonte
    tipo_receita TEXT, -- "Tributária", "Transferências", "Outras"
    codigo_receita TEXT, -- Código contábil completo
    
    -- Valores
    vl_receita NUMERIC(15, 2) NOT NULL DEFAULT 0,
    vl_previsto NUMERIC(15, 2), -- Valor previsto no orçamento
    
    -- Origem do Recurso
    fonte_recurso TEXT, -- Ex: "01 - TESOURO", "05 - TRANSFERÊNCIAS FEDERAIS"
    codigo_aplicacao TEXT, -- Código de aplicação/destinação
    
    -- Temporal
    dt_lancamento DATE,
    mes_competencia INTEGER, -- 1-12
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT revenues_municipio_slug_fk FOREIGN KEY (municipio_slug) 
        REFERENCES cities(slug) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_revenues_municipio_slug ON public.municipal_revenues(municipio_slug);
CREATE INDEX IF NOT EXISTS idx_revenues_exercicio ON public.municipal_revenues(exercicio);
CREATE INDEX IF NOT EXISTS idx_revenues_tipo ON public.municipal_revenues(tipo_receita);
CREATE INDEX IF NOT EXISTS idx_revenues_mes ON public.municipal_revenues(mes_competencia);
CREATE INDEX IF NOT EXISTS idx_revenues_valor ON public.municipal_revenues(vl_receita DESC);

-- RLS Policies (Row Level Security)
ALTER TABLE public.municipal_revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to revenues"
    ON public.municipal_revenues
    FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to insert revenues"
    ON public.municipal_revenues
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update revenues"
    ON public.municipal_revenues
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Comentários
COMMENT ON TABLE public.municipal_revenues IS 'Receitas municipais importadas do Portal TCE-SP';
COMMENT ON COLUMN public.municipal_revenues.vl_receita IS 'Valor arrecadado da receita';
COMMENT ON COLUMN public.municipal_revenues.tipo_receita IS 'Classificação: Tributária, Transferências, Outras';
