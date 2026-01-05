-- Adiciona colunas de estilo à tabela map_notes
ALTER TABLE public.map_notes 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#F59E0B', -- Amber-500 default
ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'circle';  -- circle, square, triangle, diamond

-- Comentário para documentação
COMMENT ON COLUMN public.map_notes.color IS 'Hex color code or Tailwind class alias';
COMMENT ON COLUMN public.map_notes.shape IS 'Shape identifier: circle, square, triangle, diamond';
