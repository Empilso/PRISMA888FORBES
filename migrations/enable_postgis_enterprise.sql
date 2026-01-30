-- 1. Habilita a extensão PostGIS (Geografia Profissional)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Adiciona a coluna de geometria espacial na tabela locations
-- GEOMETRY(Point, 4326) significa: Ponto Geográfico usando padrão GPS Mundial (WGS 84)
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

-- 3. Preenche a nova coluna usando as colunas lat/lng existentes
-- ST_SetSRID(ST_MakePoint(lng, lat), 4326) converte números em Ponto GPS
UPDATE locations 
SET geom = ST_SetSRID(ST_MakePoint(CAST(lng AS FLOAT), CAST(lat AS FLOAT)), 4326)
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 4. Cria o Índice Espacial (GIST) - O segredo da validade
-- Isso faz as buscas por área serem instantâneas, não importa se tem 10 ou 1 milhão de pontos.
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST (geom);

-- 5. Função de RPC para buscar Clusters (Server-Side)
-- O Frontend chama essa função passando o zoom/área, e o banco retorna já agrupado.
CREATE OR REPLACE FUNCTION get_map_clusters(
    min_lat float, 
    min_lng float, 
    max_lat float, 
    max_lng float,
    zoom_level int
)
RETURNS TABLE (
    id text,
    lat float,
    lng float,
    count bigint,
    is_cluster boolean
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Lógica Simplificada para Demo (retorna pontos brutos se zoom for alto, cluster se baixo)
    -- Num cenário real Enterprise, usaríamos ST_SnapToGrid baseado no zoom
    
    IF zoom_level >= 13 THEN
        -- Zoom Alto: Retorna pontos individuais
        RETURN QUERY
        SELECT 
            l.id::text,
            ST_Y(l.geom)::float as lat,
            ST_X(l.geom)::float as lng,
            1::bigint as count,
            false as is_cluster
        FROM locations l
        WHERE l.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        LIMIT 500; -- Proteção de segurança
    ELSE
        -- Zoom Baixo: Retorna Clusters (Agrupado por Grid)
        -- Grid Size varia com zoom: 0.1 graus (~11km)
        RETURN QUERY
        SELECT 
            'cluster-' || ST_GeoHash(l.geom, 5) as id,
            AVG(ST_Y(l.geom))::float as lat,
            AVG(ST_X(l.geom))::float as lng,
            COUNT(*)::bigint as count,
            true as is_cluster
        FROM locations l
        WHERE l.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        GROUP BY ST_GeoHash(l.geom, 5);
    END IF;
END;
$$;
