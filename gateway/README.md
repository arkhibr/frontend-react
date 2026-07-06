# gateway

## Responsabilidade

Porta única de entrada da plataforma entre os MFEs e os BFFs. Aplica correlação de requisição, controle de tráfego (rate limiting) e auditoria antes de rotear cada requisição, por prefixo de path, ao BFF correspondente.

## Estrutura

| Arquivo | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Configuração via variáveis de ambiente (porta, URLs dos BFFs, limites de tráfego, caminho do log de auditoria) |
| [`src/correlationId.ts`](./src/correlationId.ts) | Gera/propaga `X-Correlation-Id` por requisição |
| [`src/rateLimit.ts`](./src/rateLimit.ts) | Limites de tráfego global e de mutação (POST/PUT/DELETE/PATCH) |
| [`src/auditLog.ts`](./src/auditLog.ts) | Grava uma linha JSON por requisição em `logs/audit.log` |
| [`src/routing.ts`](./src/routing.ts) | Resolve o BFF alvo a partir do prefixo `/bff/<nome>` |
| [`src/proxy.ts`](./src/proxy.ts) | Roteia/encaminha para o BFF, reescrevendo o prefixo |
| [`src/app.ts`](./src/app.ts) | Monta o pipeline de middlewares — usado pelos testes via `supertest` |
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

## Decisões relevantes

- [ADR-015](../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
