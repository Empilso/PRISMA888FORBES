-- 1. Criar tipo enum para tipos de monitoramento
DO $$ BEGIN
    CREATE TYPE social_monitor_type AS ENUM ('handle', 'keyword', 'hashtag');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alterar tabela social_monitors
ALTER TABLE social_monitors 
ADD COLUMN IF NOT EXISTS monitor_type social_monitor_type DEFAULT 'handle',
ADD COLUMN IF NOT EXISTS query_term VARCHAR(255);

-- 3. Atualizar registros existentes para o tipo 'handle'
UPDATE social_monitors SET query_term = handle WHERE query_term IS NULL;

-- RLS (Row Level Security)
ALTER TABLE social_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_monitors_all_access" ON social_monitors
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_social_monitors_updated_at
    BEFORE UPDATE ON social_monitors
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
