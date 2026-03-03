-- ========================================
-- MIGRAÇÃO: ADICIONAR COLUNAS FALTANTES NA TABELA PROFILES
-- ========================================
-- A tabela profiles já existe, mas falta a coluna terms_accepted_at

BEGIN;

-- 1. Adicionar coluna terms_accepted_at se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'terms_accepted_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN terms_accepted_at TIMESTAMPTZ;
        
        RAISE NOTICE '✅ Coluna terms_accepted_at adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna terms_accepted_at já existe';
    END IF;
END $$;

-- 2. Adicionar coluna avatar_url se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN avatar_url TEXT;
        
        RAISE NOTICE '✅ Coluna avatar_url adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna avatar_url já existe';
    END IF;
END $$;

-- 3. Verificar se a coluna role existe, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role TEXT DEFAULT 'staff';
        
        RAISE NOTICE '✅ Coluna role adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna role já existe';
    END IF;
END $$;

-- 4. Verificar se a coluna campaign_id existe, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id);
        
        RAISE NOTICE '✅ Coluna campaign_id adicionada';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna campaign_id já existe';
    END IF;
END $$;

-- 5. Habilitar RLS se ainda não estiver
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS (se não existirem)
DO $$
BEGIN
    -- Remove políticas antigas se existirem
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

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

    RAISE NOTICE '✅ Políticas RLS criadas';
END $$;

-- 7. Criar função helper se não existir
CREATE OR REPLACE FUNCTION public.has_accepted_terms(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND terms_accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar trigger se não existir
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Popular perfis de usuários existentes (que ainda não têm perfil)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email,
    raw_user_meta_data->>'full_name' as full_name,
    COALESCE(raw_user_meta_data->>'role', 'staff')::user_role as role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 10. Verificação final
DO $$
DECLARE
    total_profiles INTEGER;
    total_auth_users INTEGER;
    total_with_terms INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;
    SELECT COUNT(*) INTO total_auth_users FROM auth.users;
    SELECT COUNT(*) INTO total_with_terms FROM public.profiles WHERE terms_accepted_at IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!              ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Status:';
    RAISE NOTICE '   • Usuários no Auth: %', total_auth_users;
    RAISE NOTICE '   • Perfis criados: %', total_profiles;
    RAISE NOTICE '   • Perfis com termos aceitos: %', total_with_terms;
    RAISE NOTICE '   • RLS: Habilitado (3 políticas)';
    RAISE NOTICE '   • Trigger: Configurado';
    RAISE NOTICE '   • Função helper: has_accepted_terms()';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PRONTO PARA A MISSÃO 31!';
    RAISE NOTICE '';
END $$;

COMMIT;
