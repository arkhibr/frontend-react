# mfe-emprestimo

Microfrontend autônomo de simulação de empréstimo. Buildado em Vite lib mode (ESM único),
deployado num bucket S3 (LocalStack) e carregado pelo shell via `import()`.

No manifesto, declara `dependsOn: ["endereco"]` — apenas para exercitar a **ordem de carga**
(ordenação topológica do shell). MFEs não se comunicam entre si; falam só com o back-end.

| Arquivo | Responsabilidade | Decisão |
|---------|------------------|---------|
| [`src/index.tsx`](src/index.tsx) | Contrato `mount`/`unmount` (ponto de entrada) | ADR-009 |
| [`src/EmprestimoApp.tsx`](src/EmprestimoApp.tsx) | Orquestra carga/salvamento via API | ADR-008 |
| [`src/EmprestimoForm.tsx`](src/EmprestimoForm.tsx) | Formulário (react-hook-form) | — |
| [`src/api/httpClient.ts`](src/api/httpClient.ts) | Cliente HTTP autônomo (sem dep do shell) | ADR-008 |
| [`src/contract.ts`](src/contract.ts) | Cópia local do contrato do shell | ADR-009 |
| [`vite.config.ts`](vite.config.ts) | Build lib mode → `dist/emprestimo.js` | ADR-011 |
| [`scripts/deploy.ts`](scripts/deploy.ts) | Upload para bucket LocalStack | ADR-011 |

## Comandos
- `npm run build` — gera `dist/emprestimo.js`
- `npm run deploy` — sobe o bundle para o bucket `mfe-emprestimo` no LocalStack
- `npm run test:coverage` — testes + cobertura (≥ 80%)
