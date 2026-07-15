# bff-endereco

## Responsabilidade

BFF (Backend for Frontend) do MFE de endereço. Expõe `GET`/`PUT
/usuario/endereco` somente por meio do gateway interno; valida a chave de serviço,
a identidade recebida e o schema do endereço antes da mutação.

## Estrutura

| Arquivo | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Porta do serviço via variável de ambiente |
| [`src/auth.ts`](./src/auth.ts) | Valida a credencial interna do gateway |
| [`src/validation.ts`](./src/validation.ts) | Valida CEP, campos permitidos e tamanhos |
| [`src/legacyBackend.ts`](./src/legacyBackend.ts) | Back-end legado simulado (fixture em memória) |
| [`src/routes.ts`](./src/routes.ts) | Rotas `GET`/`PUT /usuario/endereco` |
| [`src/app.ts`](./src/app.ts) | Monta o app Hono — usado pelos testes via `app.request()` |
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
| `INTERNAL_GATEWAY_KEY` | Segredo exigido do gateway; obrigatório em produção | somente dev |

Não exponha este BFF com `ports` em produção. Ele deve ficar na rede interna e
ser acessível exclusivamente pelo gateway.

## Decisões relevantes

- [ADR-015](../../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
