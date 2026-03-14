-- ==============================================================================
-- PRISMA888 FORBES ENTERPRISE - MALHA IBGE (POSTGIS)
-- Objetivo: Armazenar polígonos dos bairros e servir via JSON de alto desempenho
-- ==============================================================================

-- 1. Habilitar a extensão espacial (caso não esteja habilitada)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Criar a tabela de Bairros Específica para a Malha IBGE
CREATE TABLE IF NOT EXISTS public.ibge_bairros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_ibge_municipio TEXT NOT NULL,
    nome_bairro TEXT NOT NULL,
    codigo_bairro TEXT, -- Opcional: código específico do bairro no censo
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índice espacial (CRÍTICO para performance no mapa)
CREATE INDEX IF NOT EXISTS ibge_bairros_geom_idx 
ON public.ibge_bairros USING GIST (geom);

-- Índice comum para busca rápida por município
CREATE INDEX IF NOT EXISTS ibge_bairros_municipio_idx 
ON public.ibge_bairros (codigo_ibge_municipio);

-- 4. Função RPC (Remote Procedure Call) Otimizada
-- O Front/Next.js vai chamar isso para receber tudo mastigado.
CREATE OR REPLACE FUNCTION get_bairros_geojson(municipio_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Permite ser chamada por usuários anon/authenticated
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Constrói um FeatureCollection seguindo o padrão GeoJSON estrito
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::jsonb,
                    'properties', jsonb_build_object(
                        'id', id,
                        'nome_bairro', nome_bairro,
                        'codigo_ibge_municipio', codigo_ibge_municipio
                    )
                )
            ), 
            '[]'::jsonb
        )
    )
    INTO result
    FROM public.ibge_bairros
    WHERE codigo_ibge_municipio = municipio_codigo;

    RETURN result;
END;
$$;

-- Permissões (Habilitar acesso para a API)
GRANT EXECUTE ON FUNCTION get_bairros_geojson(text) TO anon;
GRANT EXECUTE ON FUNCTION get_bairros_geojson(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bairros_geojson(text) TO service_role;

-- Configurar RLS (Row Level Security) - Leitura Pública liberada para a malha
ALTER TABLE public.ibge_bairros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bairros são visíveis para todos"
    ON public.ibge_bairros FOR SELECT
    USING (true);
