# Design — Plataforma de Microfrontends Dinâmicos (Sub-projeto A)

> **Status:** aprovado em brainstorming · **Data:** 2026-06-04 · **Autor:** Marco Mendes
> **Escopo deste spec:** Sub-projeto A — a Plataforma (shell nuclear + runtime de MFE) **+** o MFE de referência `mfe-endereco` ponta-a-ponta.
> **Fora deste spec:** `mfe-emprestimo` (Sub-projeto B, spec próprio).

## 1. Objetivo e contexto

Estender a POC atual (`frontend-react` — SPA React 19 + TS + Vite, arquitetura FSD) para uma **plataforma de microfrontends dinâmicos**. O repositório atual passa a ser o **shell nuclear imutável** (home, login, logout) e ganha um **runtime** que carrega MFEs autônomos a partir de buckets S3, em runtime, montando cada um dentro de uma `<div>`.

### Requisitos de origem

- MFE nuclear (home/login/logout) **imutável** — nenhum time de domínio o altera.
- Todos os demais módulos são **MFEs injetados dinamicamente a partir da home**.
- Cada MFE é **autônomo**: não depende de outros MFEs por padrão.
- A configuração de quais MFEs carregar é feita por **arquivo de configuração** (banco de dados descartado), declarando: (1) MFEs ativos, (2) estado de cada um, (3) rede de dependências.
- Dependência entre MFEs declarada **explicitamente** → garante ordem de carregamento.
- Cada MFE em um **bucket S3** (LocalStack local), instanciado dentro de uma `<div>`.
- MFEs **só falam com o back-end** — sem comunicação direta entre si.
- Build e deploy **totalmente independentes** por MFE.
- **Mínimo de 3 repositórios para 2 MFEs**: um por módulo + o principal (escrita restrita).
- E2E com Playwright; unidade com Vitest; cobertura para publicação independente.
- READMEs com mapa código → decisão; ADRs com links para arquivos.
- Domínios da POC: alteração de endereço, fale conosco, simulação de empréstimo. **Esta POC começa com 2 MFEs: endereço + empréstimo.**

## 2. Decisões já tomadas (brainstorming)

| # | Decisão | Justificativa |
|---|---------|---------------|
| D1 | **Orquestração:** Docker (LocalStack :4566) + scripts Node (AWS SDK v3 JS). Sem .NET/Aspire. | Projeto é 100% Node/Vite; mantém a stack homogênea. |
| D2 | **Integração:** contrato `mount`/`unmount` via **Vite lib mode + `import()` ESM nativo**. **Module Federation descartado.** | Module Federation existe para *compartilhar* deps (React singleton) — contraria "autônomo, sem deps entre si". O contrato é a fronteira mínima e nativa. |
| D3 | **Repos:** `frontend-react` vira o **shell nuclear**; cada MFE é repo git próprio em pasta-irmã local. | Atende "mín. 3 repos / 2 MFEs". Escrita restrita via CODEOWNERS + branch protection (no push futuro). |
| D4 | **POC com 2 MFEs:** `endereco` + `emprestimo`. | Fecha o ciclo ponta-a-ponta; o 2º MFE prova adição sem tocar os outros. |
| D5 | **Manifesto separado** (`mfe-manifest.json`), distinto do `config.json` atual. | Dono e ciclo de vida diferentes (plataforma curadora a rede; config = ambiente/tema). |
| D6 | **Estados do MFE:** `active` / `disabled` / `maintenance`. | Cobre ativação, ocultação e janela de manutenção. |
| D7 | **Validação do manifesto:** validador manual enxuto (sem `zod`). | Coerente com o estilo do `loadConfig` atual; evita inflar deps numa POC. |
| D8 | **Back-end = MSW** por repo; API real fora de escopo (troca por mudança de `apiUrl`). | Mantém foco na arquitetura de MFE; o canal MFE↔API é real e testado, só o servidor é simulado. |

## 3. Topologia de repositórios

```
arkhi-mfe/                       ← orquestração comum (docker-compose LocalStack, scripts)
├── shell-nuclear/  (este repo)  ← núcleo imutável + RUNTIME de MFE
├── mfe-endereco/                ← repo próprio (lib mode)  → bucket: mfe-endereco
└── mfe-emprestimo/              ← repo próprio (Sub-projeto B) → bucket: mfe-emprestimo
```

- Pastas-irmãs locais, cada uma um repositório git real (pusháveis para `arkhibr` depois).
- `arkhi-mfe/` guarda `docker-compose.yml` (LocalStack) e scripts comuns de orquestração.

## 4. Contrato `mount` / `unmount` (núcleo arquitetural — ADR-009)

```ts
// Contrato versionado — publicado pelo shell, consumido por todo MFE.
export interface MfeMountContext {
  apiUrl: string                   // back-end alvo; MFE só fala com isto
  token: string | null             // a sessão é do shell; MFE recebe snapshot
  onUnauthorized: () => void       // MFE sinaliza 401 → shell decide logout/refresh
  basePath: string                 // rota base onde o MFE foi montado
}

export function mount(el: HTMLElement, ctx: MfeMountContext): void
export function unmount(el: HTMLElement): void
```

Regras do contrato:

- O bundle ESM do MFE **deve** exportar `mount` e `unmount`. O shell valida a presença de ambos antes de montar; ausência → erro isolado naquele MFE.
- O shell faz `const m = await import(/* @vite-ignore */ url)` e chama `m.mount(div, ctx)`.
- Ao sair da rota (ou estado virar `maintenance`/`disabled`), o shell chama `m.unmount(div)`.
- Cada MFE empacota **seu próprio React, seu próprio estado/React Query, seus próprios estilos**. Zero dependência compartilhada; zero barramento MFE↔MFE.
- Comunicação **somente** shell→MFE (via `ctx`) e MFE→back-end (via `apiUrl`).

## 5. Manifesto de MFEs (`mfe-manifest.json` — ADR-010)

```jsonc
{
  "schemaVersion": 1,
  "mfes": [
    {
      "id": "endereco",
      "name": "Alteração de Endereço",
      "state": "active",                 // active | disabled | maintenance
      "url": "http://localhost:4566/mfe-endereco/endereco.js",
      "route": "/endereco",
      "dependsOn": []
    },
    {
      "id": "emprestimo",
      "name": "Simulação de Empréstimo",
      "state": "active",
      "url": "http://localhost:4566/mfe-emprestimo/emprestimo.js",
      "route": "/emprestimo",
      "dependsOn": ["endereco"]          // exercita o resolvedor de ordem
    }
  ]
}
```

Semântica:

| Campo | Função |
|-------|--------|
| `schemaVersion` | versão do schema do manifesto; validador rejeita versões desconhecidas |
| `id` | identificador único do MFE |
| `name` | rótulo exibido no menu |
| `state` | `active` → carrega e monta · `disabled` → ignorado (não aparece) · `maintenance` → aparece no menu, mas a `<div>` exibe aviso em vez de montar |
| `url` | endpoint do bundle ESM no bucket S3 (LocalStack) |
| `route` | rota no shell onde o MFE é montado |
| `dependsOn` | ids dos MFEs que devem carregar antes → ordenação topológica |

Validação (D7): validador manual que **falha rápido** em — `schemaVersion` desconhecida, campos obrigatórios ausentes, `state` inválido, `dependsOn` apontando para `id` inexistente, ou **ciclo de dependência**.

## 6. Runtime do shell (o loader)

Novos módulos em `src/app/mfe/` (camada `app` do FSD — composição da aplicação):

| Módulo | Responsabilidade |
|--------|------------------|
| `manifest.ts` | carrega e valida `mfe-manifest.json` (fail fast) |
| `dependencyResolver.ts` | ordenação topológica de `dependsOn` + detecção de ciclo |
| `MfeHost.tsx` | componente que monta/desmonta um MFE numa `<div>`; error boundary; loading; estado `maintenance` |
| `registry.ts` | expõe os MFEs ativos para o menu e o registro de rotas |

Sequência no boot (estende `src/main.tsx`):

1. `loadConfig()` (já existe) → `loadManifest()` (novo).
2. Valida o schema do manifesto; **falha rápido** se inválido.
3. **Ordenação topológica** de `dependsOn` + **detecção de ciclo** (erro fatal claro).
4. Monta o menu/nav a partir do manifesto (apenas `active` + `maintenance`).
5. Registra **rotas dinâmicas** no react-router a partir do manifesto.
6. Em cada rota de MFE, `<MfeHost>`:
   - cria a `<div>` host;
   - `import(url)` → valida exports → `mount(div, ctx)`;
   - no cleanup: `unmount(div)`;
   - **error boundary** isola crash do MFE (não derruba o shell);
   - `state === 'maintenance'` → renderiza aviso em vez de montar.

## 7. Comunicação & isolamento

- **shell → MFE**: exclusivamente via `ctx` no `mount` (apiUrl, token, onUnauthorized, basePath).
- **MFE → back-end**: direto, com httpClient próprio do MFE, para `apiUrl`.
- Sessão pertence ao shell. Token passa como snapshot; em 401 o MFE chama `onUnauthorized` (POC: logout simples, sem refresh complexo).
- Sem Redux compartilhado, sem barramento, sem import cruzado entre MFEs.

## 8. Back-end / mocks (MSW)

- **Dev:** cada repo tem seu próprio MSW com os handlers do seu domínio. O shell mantém os handlers de auth.
- `mfe-endereco`: handlers de leitura/atualização de endereço do usuário.
- O MFE faz `fetch` real para `apiUrl`; o MSW responde no lugar do servidor. Trocar por API real = mudar `apiUrl` no `config.json`, sem alterar o MFE.

## 9. Build & deploy

- **Cada MFE:** `vite build` em **lib mode** → `dist/<id>.js` (ESM único, React embutido).
- **`scripts/deploy-mfe.ts`** (AWS SDK v3 JS): `CreateBucket` idempotente + `PutObject` para LocalStack `:4566`, com hospedagem estática / leitura pública.
- **`docker-compose.yml`** sobe o LocalStack.
- **`npm run env:up`** orquestra: sobe LocalStack + faz deploy dos MFEs nos buckets.
- **Shell:** build normal; servido via `vite preview` (ou bucket próprio) apontando o manifesto para as URLs dos buckets.

## 10. Qualidade

- **Vitest por repo:**
  - shell: `manifest` (validação), `dependencyResolver` (topo-sort + ciclo), `MfeHost` (montagem, unmount, error boundary, maintenance).
  - `mfe-endereco`: contrato (`mount`/`unmount`) + lógica de domínio + formulário.
- **Cobertura por repo:** threshold de **80%** (configurado no `vitest.config`), garantindo publicação independente sem risco de impacto.
- **Playwright (no shell):** sobe LocalStack + deploy → login → navega até `/endereco` → MFE monta na `<div>` → fluxo de alteração de endereço. Inclui caso de **MFE ausente/com erro** para provar isolamento (shell sobrevive).

## 11. Documentação

- **README por repo** com mapa código → decisão arquitetural (padrão doc-as-code já adotado, com links para arquivos-fonte).
- **Novos ADRs** (linkados aos arquivos), continuando a numeração existente:
  - **ADR-008** — Arquitetura de microfrontends dinâmicos (visão geral, shell nuclear, S3/LocalStack).
  - **ADR-009** — Contrato `mount`/`unmount` (o ADR robusto: motivação, opções, por que Module Federation foi descartado, contrato formal, trade-offs).
  - **ADR-010** — Manifesto de MFEs + resolução de dependências (estados, ordenação topológica, validação fail-fast).
  - **ADR-011** — Deploy independente via S3/LocalStack (buckets, lib mode, script de deploy).
- Atualizar `docs/architecture/README.md` (mapa de módulos + diagramas C4) e a tabela de ADRs.

## 12. Decomposição em specs/planos

| Spec | Escopo |
|------|--------|
| **A (este)** | Plataforma: runtime do shell + contrato + docker/LocalStack + deploy script + `mfe-endereco` ponta-a-ponta. |
| **B** | `mfe-emprestimo` — prova que adicionar um MFE **não toca** o shell nem o outro MFE. |

## 13. Critérios de aceite (Sub-projeto A)

- [ ] `frontend-react` (shell) carrega `mfe-manifest.json`, valida e falha rápido em manifesto inválido.
- [ ] Ordenação topológica resolve a ordem de carga e detecta ciclos.
- [ ] `mfe-endereco` é buildado em lib mode, deployado num bucket LocalStack e carregado pelo shell via `import()` ESM.
- [ ] O MFE monta dentro de uma `<div>` na sua rota e desmonta ao sair.
- [ ] Erro/ausência de um MFE não derruba o shell (error boundary).
- [ ] Estado `maintenance` exibe aviso; `disabled` oculta do menu.
- [ ] `mfe-endereco` faz chamadas HTTP reais ao `apiUrl` (respondidas por MSW), com fluxo de 401 → `onUnauthorized`.
- [ ] Vitest ≥ 80% de cobertura em cada repo; Playwright cobre o fluxo feliz + isolamento de falha.
- [ ] READMEs e ADR-008..011 escritos e linkados aos arquivos.
