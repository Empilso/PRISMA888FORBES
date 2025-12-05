-- 🛠️ DEBUG & UNLOCK: STRATEGIES

-- 1. Verifica se os dados existem (Olhe o resultado 'Results' em baixo)
-- Se der 0, a Crew não salvou nada. Se der 10, o problema é só visualização.
SELECT count(*) as total_strategies, status 
FROM public.strategies 
GROUP BY status;

-- 2. DERRUBA AS BARREIRAS (RLS) - MODO DEV
-- Isso permite que o Frontend leia e atualize as estratégias sem travas complexas de ID por enquanto
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Acesso Total Strategies" ON public.strategies;
DROP POLICY IF EXISTS "Acesso por Campanha (Strategies)" ON public.strategies;
DROP POLICY IF EXISTS "Leitura Geral Strategies" ON public.strategies;
DROP POLICY IF EXISTS "Atualização Geral Strategies" ON public.strategies;
DROP POLICY IF EXISTS "Inserção Geral Strategies" ON public.strategies;

-- Cria uma política "Porteira Aberta" para qualquer usuário logado
CREATE POLICY "Acesso Total Strategies" ON public.strategies
FOR ALL USING (auth.role() = 'authenticated');

-- 3. Confirmação
SELECT 'Políticas Atualizadas com Sucesso' as status;
