# bff-emprestimo

## Responsabilidade

BFF (Backend for Frontend) do MFE de empréstimo. Expõe um contrato limpo em
camelCase, mas só aceita chamadas autenticadas pelo gateway interno. Valida
payloads, aplica autorização por usuário e adapta o back-end legado simulado.

## Estrutura

| Arquivo/Pasta | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Porta do serviço via variável de ambiente |
| [`src/auth.ts`](./src/auth.ts) | Valida identidade e chave interna recebidas do gateway |
| [`src/validation.ts`](./src/validation.ts) | Validação runtime de propostas, simulações e termos |
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
| `INTERNAL_GATEWAY_KEY` | Segredo exigido do gateway; obrigatório em produção | somente dev |

Não exponha este BFF com `ports` em produção. Ele deve ficar na rede interna e
ser acessível exclusivamente pelo gateway.

## Decisões relevantes

- [ADR-015](../../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
