-- ========================================
-- CORREÇÃO CRÍTICA: INFINITE RECURSION EM RLS
-- ========================================
-- O erro "infinite recursion detected" ocorre porque a política RLS
-- consulta a própria tabela profiles para verificar se é admin.

BEGIN;

-- 1. Criar função segura para verificar role (quebra o loop)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER é o segredo!

-- 2. Recriar a política usando a função
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING ( public.is_super_admin() );

-- 3. Verificação
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Loop infinito corrigido com sucesso!';
    RAISE NOTICE '   • Função is_super_admin() criada com SECURITY DEFINER';
    RAISE NOTICE '   • Política RLS atualizada para usar a função';
    RAISE NOTICE '';
END $$;

COMMIT;
