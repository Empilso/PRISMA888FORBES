-- ========================================
-- VERIFICAÇÃO RÁPIDA: Tabela Profiles
-- ========================================

-- 1. Ver estrutura atual da tabela
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Contar perfis
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN terms_accepted_at IS NOT NULL THEN 1 END) as with_terms,
    COUNT(CASE WHEN terms_accepted_at IS NULL THEN 1 END) as pending_terms
FROM public.profiles;

-- 3. Ver alguns perfis de exemplo
SELECT 
    id,
    email,
    full_name,
    role,
    terms_accepted_at,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;
