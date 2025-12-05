-- ========================================
-- MISSÃO: CRIAÇÃO DA TABELA PROFILES
-- ========================================
-- Autor: Antigravity (SheepStack Genesis)
-- Data: 2025-12-02
-- Objetivo: Gerenciar perfis de usuários, aceite de termos e permissões

BEGIN;

-- ========================================
-- 1. CRIAÇÃO DA TABELA
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'staff',  -- Roles: 'super_admin', 'candidate', 'staff'
    campaign_id UUID REFERENCES public.campaigns(id),
    
    -- Controle de Onboarding (Bloqueio até aceitar termos)
    terms_accepted_at TIMESTAMPTZ,
    
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfis de usuários do sistema com controle de onboarding e permissões';
COMMENT ON COLUMN public.profiles.role IS 'super_admin: acesso total | candidate: candidato da campanha | staff: equipe de campanha';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp do aceite dos termos. NULL = usuário precisa aceitar antes de usar o sistema';

-- ========================================
-- 2. ÍNDICES (Performance)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_profiles_campaign_id ON public.profiles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Política 1: Usuário vê seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Política 2: Usuário atualiza seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id);

-- Política 3: Super admins veem todos os perfis
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- ========================================
-- 4. TRIGGER: AUTO-CRIAÇÃO DE PERFIL
-- ========================================
-- Quando um usuário é criado no Auth, cria automaticamente um perfil

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 'Trigger automático: cria perfil quando usuário é registrado no Auth';

-- Remove trigger antigo se existir para evitar duplicidade
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================
-- 5. FUNÇÃO HELPER: Verificar Aceite de Termos
-- ========================================
CREATE OR REPLACE FUNCTION public.has_accepted_terms(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND terms_accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.has_accepted_terms IS 'Verifica se o usuário já aceitou os termos de uso';

-- ========================================
-- 6. POPULAR PERFIS EXISTENTES
-- ========================================
-- Cria perfis para usuários que já existem no auth.users
-- mas ainda não têm perfil (usuários criados antes do trigger)

INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email,
    raw_user_meta_data->>'full_name' as full_name,
    COALESCE(raw_user_meta_data->>'role', 'staff') as role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 7. VERIFICAÇÃO FINAL
-- ========================================
DO $$
DECLARE
    total_profiles INTEGER;
    total_auth_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;
    SELECT COUNT(*) INTO total_auth_users FROM auth.users;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════╗';
    RAISE NOTICE '║     ✅ TABELA PROFILES CRIADA COM SUCESSO!        ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Status:';
    RAISE NOTICE '   • Usuários no Auth: %', total_auth_users;
    RAISE NOTICE '   • Perfis criados: %', total_profiles;
    RAISE NOTICE '   • RLS: Habilitado (3 políticas)';
    RAISE NOTICE '   • Trigger: Configurado (on_auth_user_created)';
    RAISE NOTICE '   • Função helper: has_accepted_terms()';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '   1. Criar tela de aceite de termos no frontend';
    RAISE NOTICE '   2. Bloquear rotas se terms_accepted_at IS NULL';
    RAISE NOTICE '   3. Implementar atualização de perfil';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PRONTO PARA A MISSÃO 31: A VÁLVULA DE EXECUÇÃO';
    RAISE NOTICE '';
END $$;

COMMIT;
