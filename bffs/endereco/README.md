# bff-endereco

## Responsabilidade

BFF (Backend for Frontend) do MFE de endereço. Expõe `GET`/`PUT /usuario/endereco` — o mesmo contrato já consumido pelo MFE hoje via MSW. Não remodela payload (o contrato já é limpo); participa do pipeline do Gateway para exercitar auditoria e controle de tráfego mesmo sem transformação de mensagem.

## Estrutura

| Arquivo | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Porta do serviço via variável de ambiente |
| [`src/legacyBackend.ts`](./src/legacyBackend.ts) | Back-end legado simulado (fixture em memória) |
| [`src/routes.ts`](./src/routes.ts) | Rotas `GET`/`PUT /usuario/endereco` |
| [`src/app.ts`](./src/app.ts) | Monta o app Express — usado pelos testes via `supertest` |
| [`src/index.ts`](./src/index.ts) | Bootstrap: sobe o servidor HTTP |

## Como usar

```bash
npm install
npm run dev     # http://localhost:4002
npm test
npm run test:coverage
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do BFF-endereco | `4002` |

## Decisões relevantes

- [ADR-015](../../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
