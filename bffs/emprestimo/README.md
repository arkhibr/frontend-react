# bff-emprestimo

## Responsabilidade

BFF (Backend for Frontend) do MFE de empréstimo. Expõe um contrato limpo em camelCase para todos os endpoints hoje consumidos pelo MFE, adaptando o back-end legado simulado (PascalCase, estilo `.svc`). É o caso central de "transformação de mensagem" da plataforma — ver [ADR-015](../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md).

## Estrutura

| Arquivo/Pasta | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Porta do serviço via variável de ambiente |
| [`src/legacyBackend.ts`](./src/legacyBackend.ts) | Back-end legado simulado: fixtures JSON + lógica de propostas em memória |
| [`src/domain.ts`](./src/domain.ts) | Contrato limpo (camelCase) exposto ao MFE |
| [`src/transform.ts`](./src/transform.ts) | Transformação legado → domínio (e domínio → legado para criação de proposta) |
| [`src/routes/`](./src/routes/) | Rotas HTTP por área de domínio (contratos, propostas, consultas, simulação, termos) |
| [`src/app.ts`](./src/app.ts) | Monta o app Express — usado pelos testes via `supertest` |
| [`src/index.ts`](./src/index.ts) | Bootstrap: sobe o servidor HTTP |

## Como usar

```bash
npm install
npm run dev     # http://localhost:4001
npm test
npm run test:coverage
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do BFF-emprestimo | `4001` |

## Decisões relevantes

- [ADR-015](../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
