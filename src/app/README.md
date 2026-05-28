# app

## Responsabilidade

Camada de inicialização da aplicação no modelo FSD. Compõe os providers globais, configura o roteador e define os estilos base. Não contém lógica de negócio — apenas orquestração de infraestrutura de primeiro nível.

## Estrutura

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| [`providers/index.tsx`](./providers/index.tsx) | Composição dos providers globais: Redux Store e QueryClient |
| [`router/`](./router/) | Configuração do roteador, definição de rotas e guards de autenticação |
| [`styles/globals.css`](./styles/globals.css) | Estilos globais e importação do Tailwind CSS |
| [`styles/tokens.css`](./styles/tokens.css) | Variáveis CSS de design (cores, espaçamentos, tipografia) |

## Como usar

O ponto de entrada da aplicação (`src/main.tsx`) monta `<Providers>` e `<RouterProvider>` nesta ordem:

```typescript
import { Providers } from '@/app/providers'
import { router } from '@/app/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
```

`Providers` encapsula Redux e React Query — qualquer componente abaixo na árvore pode usar `useSelector`, `useDispatch` e `useQuery` sem configuração adicional.

## Decisões relevantes

- [ADR-002](../../docs/architecture/adrs/ADR-002-modularizacao.md) — define a camada `app` como topo da hierarquia FSD
- [ADR-003](../../docs/architecture/adrs/ADR-003-gerenciamento-de-estado.md) — Redux + React Query são compostos aqui via `Providers`
