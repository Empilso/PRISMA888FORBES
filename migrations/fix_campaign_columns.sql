-- Adiciona colunas faltantes para sincronizar com a criação do frontend
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS party text,
ADD COLUMN IF NOT EXISTS number integer,
ADD COLUMN IF NOT EXISTS ballot_name text,
ADD COLUMN IF NOT EXISTS election_date date,
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN campaigns.party IS 'Sigla do partido (vinculada ao ballot_name para busca de votos)';
COMMENT ON COLUMN campaigns.number IS 'Número do candidato na urna';
COMMENT ON COLUMN campaigns.ballot_name IS 'Nome oficial na urna (IDÊNTICO ao TSE)';
