# Como Executar a Migration `create_municipal_revenues.sql`

A tabela `municipal_revenues` precisa ser criada no Supabase para armazenar dados de receitas municipais.

## Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Copie o conteúdo de `migrations/create_municipal_revenues.sql`
3. Cole no editor SQL
4. Clique em **Run**

## Opção 2: Via Supabase CLI (Local)

```bash
cd /home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES
supabase db push
```

Ou executar diretamente:

```bash
supabase db execute < migrations/create_municipal_revenues.sql
```

## Opção 3: Via npx (se tiver supabase configurado)

```bash
npx supabase db push --db-url "$DATABASE_URL"
```

## Verificação Pós-Criação

Execute no SQL Editor do Supabase:

```sql
SELECT COUNT(*) FROM municipal_revenues;
-- Deve retornar 0 (tabela vazia mas existente)

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'municipal_revenues';
-- Deve listar todas as colunas
```

## Próximo Passo: Importar Dados

Após criar a tabela, importe os CSVs de receitas do TCE-SP usando o script de importação ou via Supabase Dashboard > Table Editor > Import Data.
