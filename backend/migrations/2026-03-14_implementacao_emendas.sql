-- ETAPA 1: Inserção do Candidato Bobô
-- Primeiro verificamos se já existe para evitar duplicatas manuais, 
-- embora o script de importação vá lidar com o ID retornado.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM politicians WHERE name = 'Bobô') THEN
        INSERT INTO politicians (name, partido, tipo, city_id, city_slug)
        VALUES (
          'Bobô',
          'PCdoB',
          'Deputado Estadual',
          (SELECT id FROM cities WHERE slug = 'senhor-do-bonfim-ba'),
          'senhor-do-bonfim-ba'
        );
    END IF;
END $$;

SELECT id, name, partido, tipo, city_id, city_slug
FROM politicians
WHERE name = 'Bobô';

-- ETAPA 2: Criação da Tabela de Emendas Parlamentares
CREATE TABLE IF NOT EXISTS public.parliamentary_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES public.politicians(id),
  ano_exercicio INTEGER NOT NULL,
  orgao TEXT,
  unidade_orcamentaria TEXT,
  municipio_original TEXT,
  beneficiary_city_id UUID REFERENCES public.cities(id),
  acao_programa TEXT,
  objeto_detalhado TEXT,
  area_tematica TEXT,
  valor_orcado_inicial NUMERIC(15,2) DEFAULT 0,
  valor_orcado_atual NUMERIC(15,2) DEFAULT 0,
  valor_empenhado NUMERIC(15,2) DEFAULT 0,
  valor_liquidado NUMERIC(15,2) DEFAULT 0,
  valor_pago NUMERIC(15,2) DEFAULT 0,
  raw_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_amendments_politician ON public.parliamentary_amendments(politician_id);
CREATE INDEX IF NOT EXISTS idx_amendments_ano ON public.parliamentary_amendments(ano_exercicio);
CREATE INDEX IF NOT EXISTS idx_amendments_city ON public.parliamentary_amendments(beneficiary_city_id);

-- Segurança (RLS)
ALTER TABLE public.parliamentary_amendments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'parliamentary_amendments' 
        AND policyname = 'public read'
    ) THEN
        CREATE POLICY "public read" ON public.parliamentary_amendments
        FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
