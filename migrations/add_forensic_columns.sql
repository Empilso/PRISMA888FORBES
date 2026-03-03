-- Add forensic columns to municipal_expenses
ALTER TABLE municipal_expenses 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS elemento_despesa TEXT;

-- Create index for faster filtering/searching if needed
CREATE INDEX IF NOT EXISTS idx_municipal_expenses_cpf_cnpj ON municipal_expenses(cpf_cnpj);
