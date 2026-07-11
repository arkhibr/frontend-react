# shared/auth

## Responsabilidade

Infraestrutura de sessão baseada em JWT (JSON Web Token) no navegador. Gerencia
armazenamento isolado por aba, análise de claims obrigatórios, expiração e
monitoramento proativo. Não valida assinatura: a fronteira de autenticação é o
gateway, que valida criptograficamente o token antes de encaminhar requisições.

## Estrutura

| Arquivo/Pasta | Descrição |
|---------------|-----------|
| [`tokenStorage.ts`](./tokenStorage.ts) | Interface de leitura/escrita/limpeza do token em `sessionStorage` |
| [`tokenParser.ts`](./tokenParser.ts) | Decodifica o payload e rejeita claims obrigatórios ausentes/inválidos |
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

Nunca use o resultado de `isTokenExpired` como autorização: ele só melhora a UX.
O gateway é a única autoridade para aceitar ou recusar um Bearer JWT.

## Decisões relevantes

- [ADR-004](../../../docs/architecture/adrs/ADR-004-autenticacao.md) — justifica a escolha de `sessionStorage`, o intervalo de monitoramento e a estratégia de dois mecanismos
