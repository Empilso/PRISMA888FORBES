-- ========================================
-- VERIFICAÇÃO: TABELA PROFILES
-- ========================================
-- Execute este script APÓS rodar create_profiles_table.sql
-- para verificar se tudo foi criado corretamente

-- 1. Verificar se a tabela existe
SELECT 
    table_name, 
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'profiles';

-- 2. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 4. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- 5. Verificar trigger
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. Verificar função helper
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('handle_new_user', 'has_accepted_terms');

-- 7. Contar perfis existentes
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN terms_accepted_at IS NOT NULL THEN 1 END) as accepted_terms,
    COUNT(CASE WHEN terms_accepted_at IS NULL THEN 1 END) as pending_terms
FROM public.profiles;

-- 8. Visualizar perfis (se existirem)
SELECT 
    id,
    email,
    full_name,
    role,
    terms_accepted_at,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;
