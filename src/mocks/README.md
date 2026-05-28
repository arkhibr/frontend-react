# mocks

## Responsabilidade

Servidor de simulação de API baseado em MSW (Mock Service Worker). Intercepta requisições de rede tanto em ambiente de testes (Node, via Vitest) quanto no navegador (em modo de desenvolvimento). Permite que os testes exercitem o código real de requisição sem depender da API de Clientes. Não é carregado em produção.

## Estrutura

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| [`handlers.ts`](./handlers.ts) | Definição dos interceptores de rota (ex: `POST /auth/token`) e token de teste |
| [`browser.ts`](./browser.ts) | Worker MSW para uso no navegador (modo de desenvolvimento) |
| [`server.ts`](./server.ts) | Servidor MSW para uso em Node (Vitest) |

## Como usar

Em testes Vitest, o servidor MSW é iniciado automaticamente via `src/test-setup.ts`. Para usar handlers em um teste específico:

```typescript
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

// Sobrescrever handler apenas para este teste
server.use(
  http.post('/auth/token', () =>
    HttpResponse.json({ error: 'credenciais inválidas' }, { status: 401 }),
  ),
)
```

O token de teste disponível em `handlers.ts` pode ser importado diretamente:

```typescript
import { TEST_TOKEN } from '@/mocks/handlers'

// Simular estado autenticado em testes de componente
tokenStorage.set(TEST_TOKEN)
```

Em desenvolvimento local, o worker MSW é ativado automaticamente em `src/main.tsx` quando `import.meta.env.DEV === true`.

## Decisões relevantes

- [ADR-005](../../docs/architecture/adrs/ADR-005-testes.md) — justifica a escolha do MSW e seu papel na estratégia de testes
