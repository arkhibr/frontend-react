# gateway

## Responsabilidade

Porta única de entrada pública entre os MFEs e os BFFs. Valida JWT antes de
aplicar correlação, controle de tráfego e auditoria; então remove o Bearer e
encaminha somente a identidade interna ao BFF correspondente.

## Estrutura

| Arquivo | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Configuração via variáveis de ambiente (porta, URLs dos BFFs, limites de tráfego, caminho do log de auditoria) |
| [`src/auth.ts`](./src/auth.ts) | Validação de JWT, claims e algoritmo permitido |
| [`src/correlationId.ts`](./src/correlationId.ts) | Gera/propaga `X-Correlation-Id` por requisição |
| [`src/rateLimit.ts`](./src/rateLimit.ts) | Limites global e de mutação por usuário autenticado |
| [`src/auditLog.ts`](./src/auditLog.ts) | Grava JSON lines de forma assíncrona |
| [`src/routing.ts`](./src/routing.ts) | Resolve o BFF alvo a partir do prefixo `/bff/<nome>` |
| [`src/proxy.ts`](./src/proxy.ts) | Roteia/encaminha para o BFF, reescrevendo o prefixo |
| [`src/app.ts`](./src/app.ts) | Monta o pipeline de middlewares — usado pelos testes via `app.request()` do Hono |
| [`src/index.ts`](./src/index.ts) | Bootstrap: sobe o servidor HTTP |

## Como usar

```bash
npm install
npm run dev     # http://localhost:4000, recarrega em mudanças
npm test
npm run test:coverage
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do Gateway | `4000` |
| `CORS_ORIGIN` | Origem liberada para chamadas cross-origin (o shell) | `http://localhost:5173` |
| `BFF_EMPRESTIMO_URL` | URL base do BFF de empréstimo | `http://localhost:4001` |
| `BFF_ENDERECO_URL` | URL base do BFF de endereço | `http://localhost:4002` |
| `RATE_LIMIT_GLOBAL_MAX` | Requisições/minuto por IP (todas as rotas) | `100` |
| `RATE_LIMIT_MUTATING_MAX` | Requisições/minuto por IP para POST/PUT/DELETE/PATCH | `20` |
| `AUDIT_LOG_PATH` | Caminho do arquivo de auditoria (JSON lines) | `logs/audit.log` |
| `JWT_JWKS_URL` | URL HTTPS do JWKS; obrigatória em produção, usa `RS256` | — |
| `JWT_ISSUER` | Emissor esperado do JWT; obrigatório em produção | `portal-dev` (dev) |
| `JWT_AUDIENCE` | Audiência esperada do JWT; obrigatório em produção | `portal-api` (dev) |
| `JWT_SHARED_SECRET` | Segredo `HS256`, permitido apenas fora de produção | — |
| `INTERNAL_GATEWAY_KEY` | Segredo encaminhado aos BFFs; obrigatório em produção | somente dev |

Em produção, configure `JWT_JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE` e
`INTERNAL_GATEWAY_KEY` em um secret manager. Não publique BFFs no host e não
use `JWT_SHARED_SECRET` em produção.

## Decisões relevantes

- [ADR-015](../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
