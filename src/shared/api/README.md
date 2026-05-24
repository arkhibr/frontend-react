# shared/api

## Responsabilidade

Cliente HTTP centralizado para todas as requisições à API de Clientes. Injeta automaticamente o token Bearer em cada requisição, trata respostas de erro 401 com logout e despacho de evento DOM, e padroniza o contrato de erro via `ApiError`. Não conhece nenhuma funcionalidade de negócio — é infraestrutura pura.

## Estrutura

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| `httpClient.ts` | Função `httpClient<T>()` com autoinjeção de token e tratamento de 401 |
| `types.ts` | Tipos `ApiResponse<T>` e classe `ApiError` com suporte a erros de campo |

## Como usar

```typescript
import { httpClient } from '@/shared/api/httpClient'
import type { ApiResponse } from '@/shared/api/types'

type Cliente = { id: string; nome: string }

// GET — tipagem genérica garante o retorno correto
const cliente = await httpClient<ApiResponse<Cliente>>('/clientes/123')

// POST com corpo
const novo = await httpClient<ApiResponse<Cliente>>('/clientes', {
  method: 'POST',
  body: JSON.stringify({ nome: 'Novo Cliente' }),
})
```

Erros são instâncias de `ApiError` — permitem inspecionar o código HTTP e erros de campo:

```typescript
import { ApiError } from '@/shared/api/types'

try {
  await httpClient('/clientes/123')
} catch (err) {
  if (err instanceof ApiError && err.status === 404) {
    console.log('Cliente não encontrado')
  }
  if (err instanceof ApiError && err.fieldErrors) {
    console.log(err.fieldErrors) // { nome: 'Campo obrigatório' }
  }
}
```

## Decisões relevantes

- [ADR-004](../../../docs/architecture/adrs/ADR-004-autenticacao.md) — o `httpClient` lê o token via `tokenStorage` e despacha `auth:unauthorized` em respostas 401
