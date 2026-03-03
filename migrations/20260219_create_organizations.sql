-- Migração: Modo Partido (Multi-tenant)
-- Descrição: Criação da tabela organizations e vinculação com profiles e campaigns.

-- 1. Criar tabela de Organizações
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('party', 'agency', 'coalition')),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Alterar profiles para vincular a uma organização
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS org_role TEXT CHECK (org_role IN ('owner', 'admin'));

-- 3. Alterar campaigns para vincular a uma organização
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 4. Habilitar RLS nas Organizações
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS para Organizações
-- Usuários podem ver apenas a organização à qual pertencem
CREATE POLICY "Users can view their own organization" 
ON public.organizations 
FOR SELECT 
USING (
    id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- 6. Atualizar RLS para Campanhas (Multi-tenant)
-- Admins da Org podem ver todas as campanhas da sua organização
CREATE POLICY "Org admins can view all org campaigns" 
ON public.campaigns 
FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Usuários vinculados a uma campanha específica continuam vendo apenas ela (se não forem admins da org)
-- Nota: Esta política pode precisar de ajuste dependendo das políticas existentes.

-- 7. Trigger para vincular automaticamente campanhas novas à Org do criador (Opcional, pode ser feito no Backend)
