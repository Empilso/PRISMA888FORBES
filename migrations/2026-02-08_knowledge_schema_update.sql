-- Add category and city_id to knowledge_files
ALTER TABLE knowledge_files 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'geral', -- plano_governo, dossie, contrato, geral
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_files_city ON knowledge_files(city_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_category ON knowledge_files(category);
