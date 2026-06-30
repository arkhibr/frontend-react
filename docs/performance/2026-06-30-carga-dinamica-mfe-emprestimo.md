# Relatório de Performance — Carga Dinâmica do MFE de Empréstimo

**Data da execução:** 2026-06-30
**MFE medido:** `emprestimo` (Simulação de Empréstimo) — rota `/emprestimos`
**Harness:** `tests/perf/mfe-load.perf.ts` (projeto Playwright `perf`)
**Comando:** `npm run test:perf` (`playwright test --project=perf`), filtrado em `emprestimo`
**Natureza:** relatório **informativo**. Não há _gate_ de build, nem limiar rígido, nem falha de CI associada (ver ADR-008 e o [design](../superpowers/specs/2026-06-29-mfe-load-perf-report-design.md)).

---

## 1. Resumo executivo (TL;DR)

A carga dinâmica de um microfrontend é a soma de quatro fases. **Sob qualquer perfil de rede, o custo concentra-se inteiramente na transferência do _bundle_ pela rede (`fetchEval`).** A validação do contrato (`validate`) e a montagem React (`mount`) são desprezíveis e constantes — somam ~1 ms independentemente da rede.

| Perfil de rede | total (mediana) |
|---|---|
| Baseline (sem limite) | **13 ms** |
| Regular 4G | **790 ms** |
| Fast 3G | **1 882 ms** |
| Slow 3G | **7 247 ms** |

A conclusão durável é o **formato** do resultado, não o número absoluto: o mecanismo de orquestração (resolver manifesto → `import()` → validar contrato → `mount`) custa ~1 ms; tudo o que resta é byte na rede. **A alavanca de otimização para redes lentas é o tamanho do _bundle_ e a compressão — não o mecanismo de carga.**

---

## 2. O que é medido

O caminho de carga de um MFE no shell (ver [`src/app/mfe/`](../../src/app/mfe/README.md), ADR-008/009/010) é:

```
MfeHost.MfeMountPoint
  → loadMfeModule(url, id)    // import() dinâmico: fetch + parse + eval do bundle ESM
  → assertMfeModule(mod)      // valida o contrato (existência de mount/unmount)
  → m.mount(el, ctx)          // createRoot + primeiro render React
```

Uma instrumentação leve e sempre ligada (`src/app/mfe/perf.ts`, via `performance.mark`/`performance.measure`) emite quatro _measures_ por carga, nomeados `mfe:<id>:<fase>`:

| Fase | Fronteira instrumentada | Expectativa |
|---|---|---|
| `fetchEval` | em torno do `await import()` em `loadMfeModule` | rede + parse + eval — a fase dominada pela rede |
| `validate` | em torno de `assertMfeModule` | código nosso; ~0 ms |
| `mount` | em torno de `m.mount(el, ctx)` em `MfeHost` | primeiro render React |
| `total` | de imediatamente antes de `loadMfeModule` até imediatamente depois de `mount` retornar | custo ponta-a-ponta do mecanismo |

A instrumentação é guardada (`supported()` + `try/catch`): nunca lança e, quando `loadMfeModule` é chamado sem `id`, não emite _measure_ algum (comportamento inalterado). Cobertura por testes de unidade em `src/app/mfe/__tests__/perf.test.ts`.

---

## 3. Metodologia

### 3.1. Harness de medição (Playwright + CDP)

O harness vive no projeto Playwright `perf` (`playwright.config.ts`), isolado da suíte E2E padrão (`npm run test:e2e` **não** o executa). Para cada combinação **MFE × perfil × execução**, o fluxo é:

1. **Contexto de navegador novo** (`browser.newContext()`) — garante grafo de módulos e _cache_ HTTP **frios**. Isto é crítico: `import()` memoiza o módulo por _realm_; sem contexto novo, da 2ª execução em diante o tempo seria ~0 ms.
2. Abre uma sessão **CDP** (Chrome DevTools Protocol) e aplica:
   - `Network.setCacheDisabled(true)` — desabilita o cache HTTP;
   - `Network.emulateNetworkConditions(perfil)` — emula a rede (ver perfis abaixo).
3. **Semeia a sessão** com `seedSession(page)` — injeta um JWT de teste direto no `sessionStorage` (mais determinístico que o formulário de login num laço de medição).
4. `page.goto('/emprestimos')`.
5. Aguarda o _host_ do MFE ganhar conteúdo (`[data-mfe="emprestimo"] *`, estado `attached`) **e** o _measure_ `mfe:emprestimo:total` existir na _timeline_ — este é o sinal autoritativo de "montou".
6. Lê os _measures_ `mfe:emprestimo:*` via `performance.getEntriesByType('measure')`.
7. Fecha o contexto.

**Service Workers são bloqueados** (`serviceWorkers: 'block'`) para que o _throttling_ do CDP se aplique ao _fetch_ real do _bundle_ e o MSW (Mock Service Worker) não o intercepte nem o sirva de cache. Como efeito colateral esperado, os _fetches_ de dados internos do MFE podem falhar durante a medição — o que é irrelevante: **medimos a carga do _bundle_ + `mount()`, não a busca de dados.**

### 3.2. Perfis de rede

Aplicados via `Network.emulateNetworkConditions` (throughput em bytes/s; latência em ms):

| Perfil | Download | Upload | Latência (RTT) |
|---|---|---|---|
| Baseline | sem limite (`-1`) | sem limite (`-1`) | 0 ms |
| Regular 4G | 500 000 B/s | 375 000 B/s | 80 ms |
| Fast 3G | 200 000 B/s | 94 000 B/s | 150 ms |
| Slow 3G | 50 000 B/s | 50 000 B/s | 400 ms |

### 3.3. Amostragem e agregação

- **5 execuções a frio** por célula (perfil × MFE).
- Reporta-se a **mediana**, com **mínimo–máximo** entre parênteses, por fase.
- Implementado em `tests/perf/report.ts` (`console.table`).

### 3.4. Ambiente desta execução

| Item | Valor |
|---|---|
| Máquina | Apple M4, 10 núcleos, macOS 26.5.1 |
| Node.js | v24.16.0 |
| Playwright | 1.60.0 (Chromium headless shell 148.0.7778.96) |
| Object storage | LocalStack S3 (community 3.8.1), `docker compose -f infra/docker-compose.yml` |
| Bundle `emprestimo.js` | **332 KB** sem compressão (340 271 bytes); 85 KB se comprimido em gzip |
| Servido como | `Content-Type: application/javascript`, **sem `Content-Encoding`** (LocalStack não comprime) |

---

## 4. Resultados

`MFE: emprestimo` — mediana de 5 execuções a frio; (mínimo–máximo) entre parênteses.

| Perfil | `fetchEval` | `validate` | `mount` | `total` |
|---|---|---|---|---|
| **Baseline** | 12 ms (11–17) | 0 ms (0–0) | 1 ms (1–1) | **13 ms** (12–18) |
| **Regular 4G** | 789 ms (789–791) | 0 ms (0–0) | 1 ms (1–2) | **790 ms** (788–791) |
| **Fast 3G** | 1 881 ms (1 880–1 892) | 0 ms (0–0) | 1 ms (1–1) | **1 882 ms** (1 879–1 891) |
| **Slow 3G** | 7 246 ms (7 234–7 252) | 0 ms (0–0) | 1 ms (1–1) | **7 247 ms** (7 235–7 253) |

### 4.1. Leitura dos números

- **`fetchEval` ≈ `total`** em todos os perfis: a transferência do _bundle_ é praticamente todo o custo.
- **`validate` = 0 ms** e **`mount` = 1 ms**, constantes: o código de orquestração e o primeiro render React não dependem da rede e são desprezíveis.
- A variância entre execuções é mínima (faixas min–max estreitas), o que indica medições estáveis.

### 4.2. Conferência aritmética (por que os números fazem sentido)

O _bundle_ é servido **sem compressão** (332 KB). O tempo de `fetchEval` previsto é `latência + tamanho / throughput`:

| Perfil | Cálculo | Previsto | Medido |
|---|---|---|---|
| Regular 4G | 0,08 s + 340 271 / 500 000 | ≈ 760 ms | 789 ms |
| Fast 3G | 0,15 s + 340 271 / 200 000 | ≈ 1 850 ms | 1 881 ms |
| Slow 3G | 0,40 s + 340 271 / 50 000 | ≈ 7 210 ms | 7 246 ms |

A correspondência confirma a interpretação: **o tempo é transferência de bytes, não _overhead_ do mecanismo.**

---

## 5. Implicações e alavancas

1. **Tamanho do _bundle_ é a alavanca principal.** Cada MFE empacota a própria cópia do React (~40 KB+ gzip; React é intencionalmente não externalizado). Reduzir o _bundle_ encurta `fetchEval` proporcionalmente.
2. **Compressão é ganho imediato.** Nesta execução o _bundle_ trafega sem compressão (limitação do LocalStack). Servido com **gzip/brotli** por um CDN/Nginx real (~85 KB ou menos), a fase de rede cairia para ~¼ do medido — por exemplo, Slow 3G iria de ~7,2 s para ~2 s. Esta é a recomendação acionável mais barata.
3. **Nenhum limiar fixo de "100–200 ms" é alcançável em rede lenta** — é aritmética de transferência, não defeito do mecanismo de carga. Por isso o relatório é informativo e não um _gate_.

---

## 6. Ressalvas

- **Apenas Chromium:** a emulação de rede via CDP não existe em Firefox/WebKit.
- **Relativo à máquina:** os ms absolutos (sobretudo `mount`) dependem da CPU do _host_. A conclusão durável é o **formato** (rede domina), não o número exato.
- **Transferência sem compressão neste ambiente:** o LocalStack serve o _bundle_ cru. Em produção, espere a fase de rede comprimida (ver §5.2).
- **Dependência `dependsOn`:** `emprestimo` declara `dependsOn: ["endereco"]` no manifesto. O _measure_ `mfe:emprestimo:total` cobre a carga e a montagem **do `emprestimo`**; não inclui a carga do `endereco` como dependência neste fluxo de navegação direta.
- **Sem dados reais:** com Service Worker bloqueado, o MSW não responde; medimos carga + `mount`, não busca de dados.

---

## 7. Como reproduzir

```bash
# 1. Subir o object storage (S3 via LocalStack) na porta 4566
docker compose -f infra/docker-compose.yml up -d
# (ambiente sem mount de volume: docker run -d -p 4566:4566 -e SERVICES=s3 localstack/localstack:3)

# 2. Garantir o navegador do Playwright
npx playwright install chromium

# 3. Rodar o relatório (o projeto perf-setup publica os bundles no S3 automaticamente;
#    o servidor de dev em :5173 sobe sozinho via webServer do Playwright)
npm run test:perf                     # todos os MFEs
npx playwright test --project=perf -g emprestimo   # somente emprestimo
```

A saída é uma tabela por MFE no console, ao final da execução.

---

## 8. Nota de manutenção do harness

Durante esta execução, o harness falhava 100% das vezes para o `emprestimo` com `TimeoutError` no `waitForSelector`. **Causa-raiz:** o `emprestimo` injeta seu tema como um `<style data-emprestimo-theme>` **prepended** como primeiro filho do _host_ (`mfes/emprestimo/src/theme/inject.ts`, contrato visual da ADR-014). O seletor `[data-mfe="emprestimo"] *` usava o estado _default_ `visible` do Playwright, que escolhe o **primeiro** elemento correspondente — o `<style>` — e espera que ele fique visível; um `<style>` nunca é visível, então o _timeout_ estourava. O `endereco` não tem injeção de tema, por isso o problema só se manifestava no `emprestimo`.

**Correção (mínima):** trocar o estado da espera para `state: 'attached'` em `tests/perf/mfe-load.perf.ts`. O sinal real de "montou" continua sendo o _measure_ `mfe:emprestimo:total` aguardado logo em seguida; o seletor passa a apenas confirmar que o _host_ ganhou conteúdo. A correção é robusta para todos os alvos.
