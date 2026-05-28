# shared/lib/store

## Responsabilidade

Gerenciamento de estado do cliente via Redux Toolkit. Concentra o estado síncrono e persistente da aplicação em três fatias com responsabilidades distintas. Não armazena dados remotos da API — esses ficam no React Query (ver ADR-003).

## Estrutura

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| [`index.ts`](./index.ts) | Configura a store Redux e exporta os tipos `RootState` e `AppDispatch` |
| [`authSlice.ts`](./authSlice.ts) | Fatia de autenticação: token, payload do usuário e flag `isAuthenticated` |
| [`uiSlice.ts`](./uiSlice.ts) | Fatia de UI: estado da barra lateral, modal ativo e fila de notificações (toasts) |
| [`sessionSlice.ts`](./sessionSlice.ts) | Fatia de sessão: último registro de atividade e tempo limite de inatividade |

## Como usar

```typescript
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '@/shared/lib/store'
import { login, logout } from '@/shared/lib/store/authSlice'
import { addToast, openModal } from '@/shared/lib/store/uiSlice'

// Ler estado
const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
const activeModal = useSelector((s: RootState) => s.ui.activeModal)

// Despachar ações
const dispatch = useDispatch<AppDispatch>()
dispatch(login({ token: accessToken }))
dispatch(addToast({ message: 'Salvo com sucesso', type: 'success' }))
dispatch(logout())
```

O `login` persiste o token em `sessionStorage` via `tokenStorage.set()` automaticamente. O `logout` limpa o token via `tokenStorage.clear()`.

## Decisões relevantes

- [ADR-003](../../../../docs/architecture/adrs/ADR-003-gerenciamento-de-estado.md) — define a fronteira entre estado do cliente (esta store) e estado do servidor (React Query)
- [ADR-004](../../../../docs/architecture/adrs/ADR-004-autenticacao.md) — `authSlice` é o ponto central de mutação do estado de autenticação
