# PADRÕES TÉCNICOS: FRONTEND CONTRACT (SHEEPSTACK v3.0)

## Filosofia: ZERO API BOILERPLATE
O Frontend nunca "adivinha" a API. Ele consome um contrato estrito e gera código automaticamente.

## Fluxo de Trabalho (Schema First)

### 1. Backend (FastAPI) Define o Contrato
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    id: int
    name: str
    email: str

@app.get("/users", response_model=list[User])
async def get_users():
    return [User(id=1, name="João", email="joao@example.com")]
```

### 2. OpenAPI Gerado Automaticamente
FastAPI gera `/openapi.json` automaticamente.

### 3. Frontend Gera Cliente (Orval)
```typescript
// orval.config.ts
export default {
  api: {
    input: 'http://localhost:8000/openapi.json',
    output: {
      target: './src/api/generated.ts',
      client: 'react-query',
      mode: 'tags-split',
    },
  },
};
```

```bash
npm run generate-client
```

### 4. Usar Hooks Gerados (Type-Safe)
```typescript
import { useGetUsers, useCreateUser } from '@/api/generated';

function UsersPage() {
  const { data: users, isLoading, error } = useGetUsers();
  const createUser = useCreateUser();
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      {users?.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

## TanStack Table (Grids Complexos)
Para tabelas com filtros, sorting, paginação:

```typescript
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';

const columns = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'email', header: 'Email' },
];

function UsersTable() {
  const { data: users } = useGetUsers();
  
  const table = useReactTable({
    data: users ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {header.column.columnDef.header}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {cell.getValue()}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Regras de Ouro

### ❌ PROIBIDO
```typescript
// NUNCA faça isso
const response = await fetch('/api/users');
const users = await response.json();

// NUNCA crie tipos manualmente
interface User {
  id: number;
  name: string;
}
```

### ✅ OBRIGATÓRIO
```typescript
// USE o hook gerado
const { data: users } = useGetUsers();

// Os tipos vêm automaticamente do OpenAPI
// Se o backend mudar de 'name' para 'fullName',
// o TypeScript vai quebrar no build time
```

## Benefícios
- **Type Safety Total:** Se o backend muda, o frontend não compila
- **Autocomplete:** IDE sugere todos os campos da API
- **Cache Automático:** TanStack Query gerencia cache e revalidação
- **Loading States:** `isLoading`, `isError` prontos
- **Zero Boilerplate:** Não escreve fetch, axios, error handling manual

## Checklist de Código
- [ ] Cliente gerado via Orval (não fetch manual)?
- [ ] TanStack Query para state management de API?
- [ ] TanStack Table para grids complexos?
- [ ] Shadcn/UI para componentes base?
- [ ] TypeScript strict mode ativado?
