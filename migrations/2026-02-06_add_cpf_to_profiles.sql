-- Add CPF column to profiles (Safe if exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='cpf') THEN 
        ALTER TABLE public.profiles ADD COLUMN cpf VARCHAR(14) UNIQUE;
        COMMENT ON COLUMN public.profiles.cpf IS 'CPF do usuário (formato: 000.000.000-00)';
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all profiles
-- Drop if exists to avoid error on retry
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin') 
  )
);
-- Adjusted role: 'admin' was invalid. 'super_admin' is the valid enum value.

-- Validar formato do CPF (Check constraint)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_cpf_format;

ALTER TABLE public.profiles
ADD CONSTRAINT check_cpf_format 
CHECK (cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$');
