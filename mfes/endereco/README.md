# mfe-endereco

Microfrontend autônomo de alteração de endereço. Buildado em Vite lib mode (bundle ESM — ECMAScript Modules, os módulos nativos do JavaScript — único),
deployado num bucket S3 (Amazon Simple Storage Service) no LocalStack e carregado pelo shell via `import()`.

| Arquivo | Responsabilidade | Decisão |
|---------|------------------|---------|
| [`src/index.tsx`](src/index.tsx) | Contrato `mount`/`unmount` (ponto de entrada) | ADR-009 |
| [`src/EnderecoApp.tsx`](src/EnderecoApp.tsx) | Orquestra carga/salvamento via API | ADR-008 |
| [`src/EnderecoForm.tsx`](src/EnderecoForm.tsx) | Formulário (react-hook-form) | — |
| [`src/api/httpClient.ts`](src/api/httpClient.ts) | Cliente HTTP autônomo (sem dep do shell) | ADR-008 |
| [`src/contract.ts`](src/contract.ts) | Cópia local do contrato do shell | ADR-009 |
| [`vite.config.ts`](vite.config.ts) | Build lib mode → `dist/endereco.js` | ADR-011 |
| [`scripts/deploy.ts`](scripts/deploy.ts) | Upload para bucket LocalStack | ADR-011 |

## Comandos
- `npm run build` — gera `dist/endereco.js`
- `npm run deploy` — sobe o bundle para o bucket `mfe-endereco` no LocalStack
- `npm run test:coverage` — testes + cobertura (≥ 80%)
