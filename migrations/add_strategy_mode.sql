-- Adiciona o modo de estratégia na campanha
-- territory: Foco em geografia, bairros, zeladoria (Prefeito, Vereador de Bairro)
-- ideological: Foco em causas, opinião, redes sociais (Deputado de Opinião)
-- structural: Foco em nichos, categorias profissionais, dobradinhas (Deputado de Base)

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS strategy_mode text DEFAULT 'territory';

-- Adiciona constraint para garantir integridade
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_strategy_mode') THEN 
        ALTER TABLE campaigns 
        ADD CONSTRAINT check_strategy_mode 
        CHECK (strategy_mode IN ('territory', 'ideological', 'structural'));
    END IF; 
END $$;

-- Comentário para documentação automática
COMMENT ON COLUMN campaigns.strategy_mode IS 'Define o arquétipo da estratégia: territory (Geográfico), ideological (Causa/Opinião) ou structural (Corporativo/Nicho)';
