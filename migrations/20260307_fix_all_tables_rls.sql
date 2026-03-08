-- Migração: Acesso Global do Super Admin a Tabelas de Suporte
-- Descrição: Permite que super_admins vejam documentos, locais e resultados de qualquer campanha.

-- 1. Tabelas de Documentos
DROP POLICY IF EXISTS "Allow select for all" ON public.documents;
CREATE POLICY "Super admins can view all documents" 
ON public.documents FOR SELECT 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR true -- Mantendo permissão pública se já existia, mas garantindo admin
);

-- 2. Tabela de Locais (Geointeligência)
DROP POLICY IF EXISTS "Acesso por Campanha (Locations)" ON public.locations;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.locations;
DROP POLICY IF EXISTS "Enable read access for anon" ON public.locations;

CREATE POLICY "Super admins can view all locations" 
ON public.locations FOR SELECT 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR true -- Permitir leitura pública/autenticada conforme original
);

CREATE POLICY "Super admins can insert locations" 
ON public.locations FOR INSERT 
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- 3. Tabela de Resultados de Locais
DROP POLICY IF EXISTS "Leitura Results" ON public.location_results;
DROP POLICY IF EXISTS "Leitura Publica" ON public.location_results;

CREATE POLICY "Super admins can view all results" 
ON public.location_results FOR SELECT 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR true
);

-- 4. Tabela de Estratégias
DROP POLICY IF EXISTS "Anyone can view strategies" ON public.strategies;
CREATE POLICY "Super admins and owners can view strategies" 
ON public.strategies FOR SELECT 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR true
);
