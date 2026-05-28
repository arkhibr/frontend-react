# shared/auth

## Responsabilidade

Infraestrutura de autenticação baseada em JWT. Gerencia o ciclo de vida do token no navegador: armazenamento isolado por aba, análise do payload, verificação de expiração e monitoramento proativo de sessão. Não contém lógica de UI nem despacha ações Redux diretamente — exceto `sessionMonitor`, que despacha `logout` como efeito colateral da expiração detectada.

## Estrutura

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| [`tokenStorage.ts`](./tokenStorage.ts) | Interface de leitura/escrita/limpeza do token em `sessionStorage` |
| [`tokenParser.ts`](./tokenParser.ts) | Decodifica o payload JWT e verifica expiração pelo relógio do cliente |
| [`sessionMonitor.ts`](./sessionMonitor.ts) | Inicia/para o monitoramento proativo de expiração via `setInterval` (60s) e escuta o evento `auth:unauthorized` |

## Como usar

```typescript
import { tokenStorage } from '@/shared/auth/tokenStorage'
import { parseToken, isTokenExpired } from '@/shared/auth/tokenParser'
import { sessionMonitor } from '@/shared/auth/sessionMonitor'

// Armazenar token após login
tokenStorage.set(accessToken)

// Verificar expiração antes de uma operação crítica
if (isTokenExpired(tokenStorage.get()!)) {
  // redirecionar para login
}

// Iniciar monitoramento ao autenticar (chamado pelo authSlice)
sessionMonitor.start()

// Parar monitoramento ao fazer logout
sessionMonitor.stop()
```

O `sessionMonitor` combina dois mecanismos independentes de detecção de expiração:
1. Verificação por relógio do cliente a cada 60 segundos
2. Escuta do evento DOM `auth:unauthorized` despachado pelo `httpClient` em respostas 401

## Decisões relevantes

- [ADR-004](../../../docs/architecture/adrs/ADR-004-autenticacao.md) — justifica a escolha de `sessionStorage`, o intervalo de monitoramento e a estratégia de dois mecanismos
