# Guia de Estilo - Prisma888

## Naming Conventions
- **Componentes**: PascalCase (ex: `CandidateList.tsx`)
- **Funções/Variáveis**: camelCase (ex: `fetchCandidates`, `maxRetries`)
- **Constantes**: SCREAMING_SNAKE_CASE (ex: `MAX_RETRIES`, `DEFAULT_MODEL`)
- **Arquivos**: kebab-case (ex: `create-campaign.ts`, `button-primary.tsx`)
- **Pastas**: kebab-case (ex: `components/ui`, `app/admin`)

## Estrutura de Commits (Conventional Commits)
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `refactor`: Refatoração
- `style`: Formatação
- `perf`: Performance

Exemplo: `feat(admin): adicionar filtro por campanha`

## Padrões de Código
- **Tamanho**: Máximo ~300 linhas por arquivo. Componentes grandes devem ser quebrados.
- **Funções**: Máximo ~50 linhas. Single Responsibility Principle.
- **Tipagem**:
  - TypeScript estrito no frontend (sem `any` se possível).
  - Type Hints no Python (`def func(a: str) -> int:`).
- **Tratamento de Erros**:
  - try/catch com logs explícitos.
  - Server Actions devem retornar objetos padronizados `{success: bool, message: string}`.

## Design System
- Utilizar componentes do `src/components/ui` (shadcn/ui).
- Evitar estilos inline, usar classes Tailwind utilitárias.
