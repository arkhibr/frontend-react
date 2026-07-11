# Portal Web — `frontend-react`

**Shell nuclear de uma plataforma de microfrontends dinâmicos.** Uma SPA (Single-Page Application) em React 19 + TypeScript que, além de hospedar suas próprias telas (login, dashboard), carrega **microfrontends (MFEs) autônomos em tempo de execução** a partir de buckets S3 (Amazon Simple Storage Service), sob um contrato `mount`/`unmount`. A estrutura interna segue **Feature-Sliced Design (FSD)**, com fronteiras de camada verificadas automaticamente pelo ESLint.

> 📐 **Documentação arquitetural completa:** [`docs/architecture/README.md`](docs/architecture/README.md) — diagramas C4 (modelo de arquitetura em quatro níveis: Context, Container, Component, Code), mapa de módulos e as 15 ADRs (Architecture Decision Record — registro de decisão de arquitetura).

---

## Índice

- [Conceito](#conceito)
- [Como os microfrontends funcionam](#como-os-microfrontends-funcionam)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Documentação por módulo](#documentação-por-módulo)
- [Decisões arquiteturais (ADRs)](#decisões-arquiteturais-adrs)
- [Desenvolvimento local](#desenvolvimento-local)
- [Rodando a plataforma completa (shell + MFE + S3)](#rodando-a-plataforma-completa-shell--mfe--s3)
- [Rodando Gateway + BFFs (ADR-015)](#rodando-gateway--bffs-adr-015)
- [Comandos](#comandos)
- [Estratégia de testes](#estratégia-de-testes)
- [Configuração externa e variáveis de ambiente](#configuração-externa-e-variáveis-de-ambiente)
- [Checklist de implantação](#checklist-de-implantação)

---

## Conceito

O repositório desempenha o papel de **shell nuclear**: um núcleo estável que cuida de autenticação, layout, roteamento e do carregamento dos MFEs. Funcionalidades de negócio entram e saem da plataforma **sem recompilar o shell** — basta declará-las no manifesto. Cada MFE é construído, versionado e implantado de forma independente, empacota o próprio React e se comunica apenas com o back-end (via `apiUrl`), nunca com outros MFEs. A partir da ADR-015, "o back-end" é o Gateway de API — que roteia, audita e aplica controle de tráfego antes de encaminhar cada requisição ao BFF do MFE correspondente.

<img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/e9426edc-acb4-431a-b159-fcb782b84c03" />


A decisão e o racional completos estão em [ADR-008 — Arquitetura de microfrontends dinâmicos](docs/architecture/adrs/ADR-008-microfrontends-dinamicos.md).

## Como os microfrontends funcionam

O motor vive na camada `app` do FSD — ver [`src/app/mfe/README.md`](src/app/mfe/README.md) para o mapa código → decisão. Em resumo:

1. **Manifesto.** No boot, o shell faz `fetch` de [`public/mfe-manifest.json`](public/mfe-manifest.json) e o valida _fail-fast_ ([`manifest.ts`](src/app/mfe/manifest.ts)). O manifesto declara cada MFE: `id`, `route`, `url` do bundle, `state` (`active` / `maintenance` / `disabled`) e `dependsOn`.
2. **Ordem de carga.** As dependências são resolvidas por ordenação topológica com detecção de ciclo ([`dependencyResolver.ts`](src/app/mfe/dependencyResolver.ts)).
3. **Rotas dinâmicas.** O router monta as rotas dos MFEs a partir do manifesto ([`src/app/router/`](src/app/router/README.md)) e a navegação do layout é derivada dele ([`ShellLayout.tsx`](src/app/layout/ShellLayout.tsx)).
4. **Montagem.** Ao entrar na rota, o [`MfeHost`](src/app/mfe/MfeHost.tsx) faz `import()` ESM (ECMAScript Modules — módulos nativos do JavaScript) do bundle ([`loadMfeModule.ts`](src/app/mfe/loadMfeModule.ts)), valida o contrato e chama `mount(div, ctx)`. Ao sair, `unmount(div)`.
5. **Isolamento de falha.** Um MFE que quebra é contido pelo [`MfeErrorBoundary`](src/app/mfe/MfeErrorBoundary.tsx) — o shell e os demais MFEs seguem funcionando.

O **contrato** entre shell e MFE (`mount`/`unmount` + `MfeMountContext`) está em [`src/app/mfe/types.ts`](src/app/mfe/types.ts) e detalhado em [ADR-009](docs/architecture/adrs/ADR-009-contrato-mount-unmount.md).

> ⚠️ Ao criar um novo MFE, atenção a três armadilhas conhecidas do padrão Vite lib mode — `process.env.NODE_ENV`, CORS (Cross-Origin Resource Sharing) no bucket e MSW (Mock Service Worker) vs Playwright. Estão documentadas em [ADR-011](docs/architecture/adrs/ADR-011-deploy-s3-localstack.md) e no README do MFE de exemplo.

## Estrutura do repositório

> **Topologia didática:** repo único com uma pasta por MFE. Build e deploy de cada MFE são independentes; em produção a recomendação é **um repositório isolado por MFE** — ver [ADR-011](docs/architecture/adrs/ADR-011-deploy-s3-localstack.md).

```
frontend-react/
├── src/                      ← shell nuclear (SPA + runtime de MFE)
│   ├── app/                  ← camada App: boot, providers, router, layout, runtime de MFE
│   │   ├── mfe/              ← motor de microfrontends (manifesto, loader, host, boundary)
│   │   └── layout/           ← layout do shell com navegação dinâmica
│   ├── pages/                ← telas próprias do shell (login, dashboard)
│   ├── features/             ← funcionalidades de negócio (ex.: auth)
│   ├── shared/               ← infraestrutura, UI base, config, tipos
│   └── mocks/                ← MSW (back-end simulado em dev/testes)
├── mfes/
│   ├── endereco/             ← MFE autônomo (package.json/vite/vitest/deploy próprios)
│   └── emprestimo/           ← MFE autônomo
├── gateway/                  ← Gateway de API (Express) — porta única de entrada (ADR-015)
├── bffs/
│   ├── emprestimo/           ← BFF do MFE de empréstimo — transforma o contrato legado
│   └── endereco/             ← BFF do MFE de endereço
├── infra/                    ← docker-compose com LocalStack (S3) e Gateway+BFFs
├── tests/e2e/                ← testes Playwright (inclui fluxo de MFE)
├── docs/architecture/        ← C4, mapa de módulos e ADRs
└── public/
    ├── mfe-manifest.json      ← catálogo de MFEs carregado em runtime
    └── config.json            ← config de ambiente (opcional)
```

Além disso, o padrão de organização de pastas chamado FSD (Feature Sliced Design é usado).

<img width="1254" height="1254" alt="image" src="https://github.com/user-attachments/assets/c709073d-3c74-4ee7-8e86-2e1dab8d817f" />


## Documentação por módulo

| Área | Responsabilidade | Documentação |
|------|------------------|--------------|
| Arquitetura (visão geral) | C4, mapa de módulos, índice de ADRs | [`docs/architecture/README.md`](docs/architecture/README.md) |
| Camada `app` | Inicialização, providers, router, estilos | [`src/app/README.md`](src/app/README.md) |
| Runtime de MFE | Manifesto, loader ESM, host, error boundary | [`src/app/mfe/README.md`](src/app/mfe/README.md) |
| Roteamento | Rotas declarativas, guards, lazy loading | [`src/app/router/README.md`](src/app/router/README.md) |
| Cliente HTTP | Injeção de Bearer e tratamento de 401 | [`src/shared/api/README.md`](src/shared/api/README.md) |
| Autenticação | Armazenamento, parsing e monitor de JWT (JSON Web Token) | [`src/shared/auth/README.md`](src/shared/auth/README.md) |
| Estado (Redux) | Fatias auth/ui/session | [`src/shared/lib/store/README.md`](src/shared/lib/store/README.md) |
| Mocks (MSW) | Back-end simulado | [`src/mocks/README.md`](src/mocks/README.md) |
| MFE de endereço | MFE de exemplo, ponta a ponta | [`mfes/endereco/README.md`](mfes/endereco/README.md) |
| Infra local | LocalStack S3 | [`infra/README.md`](infra/README.md) |
| Segurança | CSP, cabeçalhos, Trusted Types, rollout | [`SECURITY.md`](SECURITY.md) |
| Gateway de API | Roteamento, correlação, auditoria e controle de tráfego | [`gateway/README.md`](gateway/README.md) |
| BFF de empréstimo | Transformação de contrato legado → limpo | [`bffs/emprestimo/README.md`](bffs/emprestimo/README.md) |
| BFF de endereço | Passthrough do contrato de endereço | [`bffs/endereco/README.md`](bffs/endereco/README.md) |


## Pilha Tecnológica Adotada

<img width="1024" height="1536" alt="image" src="https://github.com/user-attachments/assets/21bb9731-29ef-4047-9c4a-0247098083ef" />


## Decisões arquiteturais (ADRs)

Em [`docs/architecture/adrs/`](docs/architecture/adrs/). As ADRs 008–015 cobrem a plataforma de microfrontends, sua segurança, seu contrato visual e o Gateway de API:

| ADR | Decisão |
|-----|---------|
| [ADR-001](docs/architecture/adrs/ADR-001-plataforma-tecnologica.md) | Plataforma tecnológica |
| [ADR-002](docs/architecture/adrs/ADR-002-modularizacao.md) | Modularização (FSD) |
| [ADR-003](docs/architecture/adrs/ADR-003-gerenciamento-de-estado.md) | Gerenciamento de estado |
| [ADR-004](docs/architecture/adrs/ADR-004-autenticacao.md) | Autenticação |
| [ADR-005](docs/architecture/adrs/ADR-005-testes.md) | Testes |
| [ADR-006](docs/architecture/adrs/ADR-006-conteinizacao.md) | Conteinerização |
| [ADR-007](docs/architecture/adrs/ADR-007-imposicao-fronteiras-arquiteturais.md) | Imposição de fronteiras arquiteturais |
| [ADR-008](docs/architecture/adrs/ADR-008-microfrontends-dinamicos.md) | **Arquitetura de microfrontends dinâmicos** |
| [ADR-009](docs/architecture/adrs/ADR-009-contrato-mount-unmount.md) | **Contrato `mount`/`unmount` shell ↔ MFE** |
| [ADR-010](docs/architecture/adrs/ADR-010-manifesto-e-dependencias.md) | **Manifesto e resolução de dependências** |
| [ADR-011](docs/architecture/adrs/ADR-011-deploy-s3-localstack.md) | **Build/deploy de MFEs em S3 (LocalStack)** |
| [ADR-012](docs/architecture/adrs/ADR-012-content-security-policy.md) | **Content Security Policy estrito e baseline de segurança** |
| [ADR-013](docs/architecture/adrs/ADR-013-trusted-types-e-reporting.md) | **Trusted Types e Reporting API** |
| [ADR-014](docs/architecture/adrs/ADR-014-css-e-contrato-visual-em-microfrontends.md) | **CSS e contrato visual em microfrontends dinâmicos** |
| [ADR-015](docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) | **Gateway de API com BFFs** |

## Desenvolvimento local

Apenas o shell (com back-end simulado via MSW):

```bash
npm install
npm run dev          # http://localhost:5173
```

Em modo de desenvolvimento o MSW é ativado automaticamente; com `apiUrl` vazio, as chamadas caem nos handlers de [`src/mocks/`](src/mocks/README.md). O boot é resiliente: se o Service Worker do MSW não registrar, o shell sobe mesmo assim (sem mocks).

## Rodando a plataforma completa (shell + MFE + S3)

Para exercitar o carregamento dinâmico real dos MFEs a partir do S3 (LocalStack):

```bash
# 1. Instalar as deps do shell (na raiz)
npm install

# 2. Publicar todos os MFEs no S3
npm run deploy       # sobe o LocalStack se preciso, instala deps,
                     # builda e valida cada bundle no bucket

# 3. Subir o shell
npm run dev          # http://localhost:5173
```

O `npm run deploy` da raiz é self-contained e pensado para um ambiente limpo: se o LocalStack (`:4566`) não estiver no ar ele o sobe via `docker compose`; para cada MFE, roda `npm ci` quando faltam dependências, builda, delega o upload e confirma HTTP `200`. Depois de validar o bundle, recalcula o SHA-256 e atualiza `integrity` no manifesto. Para publicar um MFE isolado, `cd mfes/<id> && npm run deploy` continua funcionando, mas a publicação do manifesto com o hash correspondente continua sendo obrigatória.

O shell lê [`public/mfe-manifest.json`](public/mfe-manifest.json), valida origem,
rota e hash SHA-256 de cada bundle e só então monta o MFE ao acessar sua rota. O
deploy orquestrado (`npm run deploy`) recalcula automaticamente o campo
`integrity` do manifesto após validar o artefato publicado.

## Rodando Gateway + BFFs (ADR-015)

Em três terminais separados, na raiz do repositório:

```bash
cd bffs/endereco && npm install && npm run dev    # http://localhost:4002
cd bffs/emprestimo && npm install && npm run dev  # http://localhost:4001
cd gateway && npm install && npm run dev          # http://localhost:4000
```

Ou via Docker Compose, subindo os três de uma vez:

```bash
docker compose -f infra/docker-compose.yml up -d --build gateway bff-emprestimo bff-endereco
```

Com o Gateway no ar, configure `dist/config.json` (ou `public/config.json` em dev) com `"apiUrl": "http://localhost:4000"` e suba o shell normalmente (`npm run dev`). O gateway exige um JWT válido emitido pelo provedor configurado; o MSW continua sendo a alternativa para desenvolvimento isolado sem gateway.

## Comandos

### Shell (raiz)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Vite) com HMR (Hot Module Replacement) |
| `npm run build` | Compila TS + Vite e gera `dist/` |
| `npm run deploy` | Sobe o LocalStack se preciso, builda e publica **todos os MFEs** no S3, validando cada bundle |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run test` | Testes unitários e de integração (Vitest) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run test:e2e` | Testes ponta a ponta (Playwright) |
| `npm run test:e2e:ui` | Playwright em modo UI |
| `npm run lint` | ESLint, incluindo fronteiras FSD (ver [ADR-007](docs/architecture/adrs/ADR-007-imposicao-fronteiras-arquiteturais.md)) |
| `npm run lint:css` | Stylelint nos CSS |
| `npm run type-check` | Verificação de tipos sem emitir |

### MFE (`mfes/<id>/`)

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Build em Vite **lib mode** → `dist/<id>.js` (ESM único) |
| `npm run deploy` | Publica o bundle no bucket S3 (LocalStack) via AWS SDK v3 |
| `npm run test` / `npm run test:coverage` | Testes do MFE (threshold de cobertura ≥ 80%) |

## Estratégia de testes

Detalhada em [ADR-005](docs/architecture/adrs/ADR-005-testes.md).

- **Unidade/integração (Vitest):** runtime do MFE, fatias Redux, componentes. O shell roda apenas seus testes — `mfes/**` e `**/node_modules/**` são excluídos.
- **Cobertura:** o MFE de endereço impõe threshold ≥ 80%.
- **E2E — testes end-to-end (Playwright):** [`tests/e2e/`](tests/e2e/). O fluxo de MFE valida tanto a carga dinâmica quanto o isolamento de falha (shell sobrevive a um bundle indisponível).

## Configuração externa e variáveis de ambiente

[`public/config.json`](public/config.json) é carregado em runtime **antes** de qualquer render, permitindo que um único build atenda múltiplos ambientes sem recompilar (ver [`src/shared/config/index.ts`](src/shared/config/index.ts)).

| Campo | Descrição | Padrão |
|-------|-----------|--------|
| `apiUrl` | URL base da API de Clientes | `""` (usa `VITE_API_BASE_URL` como fallback) |
| `primaryColor` | Cor primária (CSS var `--color-primary`) | `#1A56DB` |
| `secondaryColor` | Cor secundária (CSS var `--color-secondary`) | `#6B7280` |
| `mfeAllowedOrigins` | Origens autorizadas a fornecer bundles de MFE; HTTPS em produção | `[]` |

Para rodar a plataforma completa com Gateway e BFFs (ver ADR-015), aponte `apiUrl` para o Gateway: `"apiUrl": "http://localhost:4000"`. Sem Gateway/BFFs no ar, mantenha `apiUrl` vazio para usar o MSW.

Em dev, `apiUrl` vazio direciona as chamadas ao MSW. Em produção, gere/monte o `config.json` com os valores corretos antes de servir o `dist/`.

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_BASE_URL` | Fallback de `apiUrl` quando `config.json` não o define | `https://api.clientes.exemplo.com` |
| `S3_ENDPOINT` | Endpoint S3 usado pelo `deploy` do MFE | `http://localhost:4566` |

## Checklist de implantação

### Shell

1. `npm ci`
2. `npm run lint && npm run lint:css` — zero erros
3. `npm run type-check && npm run test` — tudo verde
4. `npm run build` — gera `dist/`
5. Copiar/montar `dist/` no host (wwwroot, container ou CDN — Content Delivery Network)
6. Configurar `dist/config.json` (`apiUrl`, cores, `mfeAllowedOrigins`)
6.1. Se usando Gateway+BFFs (ADR-015): publicar as três imagens (`gateway/Dockerfile`, `bffs/emprestimo/Dockerfile`, `bffs/endereco/Dockerfile`) e apontar `apiUrl` do `config.json` para a URL pública do Gateway
6.2. Configurar `CORS_ORIGIN`, `JWT_JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE` e `INTERNAL_GATEWAY_KEY` do Gateway via secret manager (ver [`gateway/README.md`](gateway/README.md))
7. Publicar o manifesto de produção com `url` HTTPS permitida e `integrity` correspondente ao bundle; bundle e manifesto devem ser promovidos juntos
8. Validar CSP (Content Security Policy) e CORS dos buckets de MFE — seguir o **playbook de rollout** em [`SECURITY.md`](SECURITY.md); conferir `CSP_CONNECT_SRC`, `CSP_REPORT_URI` e `mfeAllowedOrigins`
9. Smoke test funcional (login → dashboard → MFE)

### Cada MFE

1. `npm ci && npm run test:coverage` — cobertura ≥ 80%
2. `npm run build` — gera o bundle ESM
3. `npm run deploy` na raiz — publica no bucket, valida o artefato e atualiza `integrity` no manifesto
4. Revisar e publicar o manifesto atualizado junto com o bundle
