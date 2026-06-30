# Performance

Relatórios **informativos** de performance da plataforma de microfrontends. Não são _gates_ de build — medem e documentam, não bloqueiam.

| Relatório | Escopo | Data |
|---|---|---|
| [Carga dinâmica do MFE de Empréstimo](2026-06-30-carga-dinamica-mfe-emprestimo.md) | Tempo de carga dinâmica do MFE `emprestimo` por fase (`fetchEval`/`validate`/`mount`/`total`) sob 4 perfis de rede | 2026-06-30 |

## Como gerar

O harness vive no projeto Playwright `perf` (`tests/perf/`, ver `playwright.config.ts`). Pré-requisitos: LocalStack S3 no ar e o navegador do Playwright instalado.

```bash
docker compose -f infra/docker-compose.yml up -d
npx playwright install chromium
npm run test:perf
```

Design e instrumentação: [`docs/superpowers/specs/2026-06-29-mfe-load-perf-report-design.md`](../superpowers/specs/2026-06-29-mfe-load-perf-report-design.md) e `src/app/mfe/perf.ts`.
