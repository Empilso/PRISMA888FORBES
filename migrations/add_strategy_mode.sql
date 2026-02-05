ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS strategy_mode TEXT DEFAULT 'territory';
