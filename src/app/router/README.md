# app/router

## Responsabilidade

Configuração declarativa do roteamento da SPA com React Router v7. Define as rotas disponíveis, associa cada rota ao seu guard de autenticação e implementa carregamento preguiçoso de páginas. Não contém lógica de negócio — apenas estrutura de navegação e proteção de rotas.

## Estrutura

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| `index.tsx` | Configuração do `createBrowserRouter` com rotas protegidas e públicas |
| `routes.ts` | Constantes das rotas disponíveis (`ROUTES.LOGIN`, `ROUTES.DASHBOARD`) |
| `guards/AuthGuard.tsx` | Redireciona para `/login` se o usuário não estiver autenticado |
| `guards/GuestGuard.tsx` | Redireciona para `/dashboard` se o usuário já estiver autenticado |

## Como usar

Adicionar uma nova rota protegida:

```typescript
// src/app/router/routes.ts
export const ROUTES = {
  LOGIN:     '/login',
  DASHBOARD: '/dashboard',
  NOVA_ROTA: '/nova-rota',   // 1. adicionar a constante
} as const

// src/app/router/index.tsx
const NovaPagina = lazy(() => import('@/pages/nova-pagina'))   // 2. importar com lazy

{
  element: <AuthGuard />,   // 3. aninhar sob o guard adequado
  children: [
    {
      path: ROUTES.NOVA_ROTA,
      element: (
        <Suspense fallback={<PageLoader />}>
          <NovaPagina />
        </Suspense>
      ),
    },
  ],
}
```

## Decisões relevantes

- [ADR-002](../../../docs/architecture/adrs/ADR-002-modularizacao.md) — `router` é parte da camada `app`; páginas ficam em `src/pages/`
- [ADR-004](../../../docs/architecture/adrs/ADR-004-autenticacao.md) — guards leem `state.auth.isAuthenticated` do Redux para decidir o redirecionamento
