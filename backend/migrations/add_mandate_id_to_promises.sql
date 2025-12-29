-- Add mandate_id column to promises table
ALTER TABLE public.promises ADD COLUMN IF NOT EXISTS mandate_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_promises_mandate_id ON public.promises(mandate_id);
