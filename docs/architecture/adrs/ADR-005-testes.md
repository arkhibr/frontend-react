# ADR-005: Tática de testes

## Contexto

O projeto necessita de uma estratégia de testes que cubra três níveis: unitário/integração (lógica isolada e componentes), ponta a ponta (fluxos completos no navegador) e simulação de API (para desacoplar testes do back-end real). A escolha de Vite como ferramenta de compilação (ADR-001) limita a compatibilidade com Jest sem configuração extra de transpilação.

**Referências:** https://vitest.dev · https://playwright.dev · https://mswjs.io

## Decisão

Adotar **Vitest + Playwright + MSW (Mock Service Worker)** como conjunto de testes:

- **Vitest**: testes unitários e de integração, executados no mesmo processo do Vite
- **Playwright**: testes de ponta a ponta em navegadores reais
- **MSW (Mock Service Worker)**: interceptação de rede para simular a API de Clientes

## Opções avaliadas

### Opção 1: Vitest + Playwright + MSW (escolhida)
- **Prós**: Vitest roda sem transpilação extra (suporte nativo a ESM — ECMAScript Modules, os módulos nativos do JavaScript — e TypeScript); Playwright oferece cobertura multinavegador real; MSW intercepta na camada de rede — os testes exercitam o mesmo código de produção com respostas controladas
- **Contras**: três ferramentas distintas para aprender; Playwright exige instalação de binários de navegadores

### Opção 2: Jest + Cypress + MSW
- **Prós**: Jest é amplamente conhecido; Cypress combina testes de componente e ponta a ponta
- **Contras**: Jest exige configuração adicional de transpilação para projetos Vite/ESM; Cypress é mais pesado e lento que Playwright em CI

### Opção 3: Não fazer nada (baseline)
- **Prós**: zero esforço inicial
- **Contras**: sem rede de segurança para regressões; inaceitável para um produto em produção

## Diagrama — Níveis e Ferramentas de Teste

```mermaid
%%{init: {'theme': 'dark'}}%%
graph TD
    subgraph e2e["Ponta a Ponta — Playwright"]
        pw["tests/e2e/\nnavegador real · Chromium · Firefox · WebKit"]
    end

    subgraph integracao["Integração — Vitest + Testing Library"]
        comp["src/**/__tests__/\ncomponentes com Redux + Router\nAuthGuard · GuestGuard · Button"]
    end

    subgraph unitario["Unitários — Vitest"]
        unit["src/**/__tests__/\nfunções puras e fatias Redux\ntokenParser · authSlice · validators"]
    end

    msw(["MSW\nintercepta requisições de rede\nNode — Vitest  ·  Browser — Playwright"])
    api["API de Clientes\n(simulada pelos handlers)"]
    setup["src/test-setup.ts\nconfiguração global Vitest"]

    pw -->|"worker no browser"| msw
    comp -->|"setupServer em Node"| msw
    msw --> api
    setup -.->|"beforeAll · afterEach · afterAll"| comp
    setup -.-> unit
```

O MSW é inicializado globalmente para todos os testes Vitest em `src/test-setup.ts`:

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())   // isola handlers entre testes
afterAll(() => server.close())
```

**Teste unitário** — lógica pura sem dependências de framework (`src/shared/auth/__tests__/tokenParser.test.ts`):

```typescript
describe('isTokenExpired', () => {
  it('retorna false para token válido', () => {
    expect(isTokenExpired(VALID_TOKEN)).toBe(false)
  })
  it('retorna true para token expirado', () => {
    expect(isTokenExpired(EXPIRED_TOKEN)).toBe(true)
  })
  it('retorna true para token mal-formado', () => {
    expect(isTokenExpired('invalido')).toBe(true)
  })
})
```

**Teste de integração** — componente renderizado com Redux real (`src/app/router/guards/__tests__/AuthGuard.test.tsx`):

```typescript
describe('AuthGuard', () => {
  it('renderiza rota protegida quando autenticado', () => {
    renderAuthGuard(true)
    expect(screen.getByText('Área restrita')).toBeInTheDocument()
  })
  it('redireciona para /login quando não autenticado', () => {
    renderAuthGuard(false)
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
    expect(screen.queryByText('Área restrita')).not.toBeInTheDocument()
  })
})
```

## Desempenho — micro-benchmarks de unidades (`vitest bench`)

Além de correção, o desempenho das unidades puras (funções sem dependência de
framework, no caminho quente de cada requisição/render) é medido com o
**`vitest bench`** — o modo de benchmark do próprio Vitest, sobre `tinybench`.
Escolha deliberada: nenhuma dependência nova (o Vitest já é o runner de todos os
pacotes) e o código exercitado é o mesmo dos testes. Ferramentas de **carga**
(K6, autocannon) foram descartadas para este fim: medem throughput de endpoints
HTTP sob usuários virtuais — rodam num runtime próprio e não conseguem invocar
uma função TypeScript em processo, portanto não servem para micro-benchmark de
unidade. Elas continuam candidatas válidas para um estudo separado de carga do
Gateway/BFFs, não para o desempenho das unidades.

Os benchmarks ficam em arquivos `*.bench.ts` colocados ao lado do código, e cada
pacote expõe `npm run bench`:

```typescript
// src/shared/lib/validators/validators.bench.ts
import { bench, describe } from 'vitest'
import { isValidCPF } from './cpf'

describe('isValidCPF', () => {
  bench('CPF válido', () => {
    isValidCPF('529.982.247-25')
  })
  bench('CPF malformado (tamanho errado)', () => {
    isValidCPF('123')
  })
})
```

### Resultados executados

Snapshot executado em **2026-08-01**, em **Apple M4 (10 núcleos), Node 24.16**.
`ops/s` é a vazão medida (`hz`); `média` é o tempo por chamada; `rme` é o erro
relativo da média. **Os números absolutos são específicos da máquina — o valor
está na comparação relativa e na detecção de regressão ao longo do tempo, não no
número em si.**

**Shell (`npm run bench` na raiz)**

| Benchmark | ops/s | média | rme |
|---|---:|---:|---:|
| `isValidCPF` — CPF válido | 8,5 M | ~118 ns | ±0,09% |
| `isValidCPF` — inválido (dígito errado) | 8,5 M | ~118 ns | ±0,11% |
| `isValidCPF` — malformado (tamanho errado) | 29,4 M | ~34 ns | ±0,04% |
| `isValidEmail` — válido | 20,5 M | ~49 ns | ±0,03% |
| `isValidEmail` — inválido | 26,0 M | ~38 ns | ±0,03% |
| `parseToken` — JWT bem-formado | 2,4 M | ~412 ns | ±0,15% |
| `isTokenExpired` — token válido | 2,3 M | ~431 ns | ±0,15% |
| `isTokenExpired` — token expirado | 2,3 M | ~430 ns | ±0,07% |
| `isTokenExpired` — malformado (`catch`) | 0,54 M | ~1,84 µs | ±0,04% |

**Gateway (`npm run bench` em `gateway/`)**

| Benchmark | ops/s | média | rme |
|---|---:|---:|---:|
| `resolveTarget` — rota conhecida (`/bff/emprestimo/contratos`) | 14,7 M | ~68 ns | ±0,18% |
| `resolveTarget` — rota conhecida, query longa | 13,0 M | ~77 ns | ±0,25% |
| `resolveTarget` — BFF desconhecido (miss) | 13,7 M | ~73 ns | ±0,24% |
| `resolveTarget` — prefixo não casa (não-`/bff`) | 35,7 M | ~28 ns | ±0,04% |

**BFF de empréstimo (`npm run bench` em `bffs/emprestimo/`)**

| Benchmark | ops/s | média | rme |
|---|---:|---:|---:|
| `toContrato` — um item | 46,2 M | ~22 ns | ±0,05% |
| `toProposta` — um item | 46,9 M | ~21 ns | ±0,05% |
| `toContrato` — lista de 100 | 1,7 M | ~595 ns | ±0,15% |

### Leitura dos números

- **O caminho de erro custa mais que o de sucesso.** `isTokenExpired` com token
  malformado é ~4,3× mais lento que com token válido — é o custo de montar e
  desenrolar a exceção capturada pelo `catch`. Aceitável: erro de token é raro e
  não está no caminho feliz.
- **Saídas antecipadas dominam.** `isValidCPF` malformado (~29 M ops/s) e
  `resolveTarget` sem prefixo `/bff` (~36 M ops/s) são as mais rápidas porque
  retornam no primeiro `if`/regex, antes de qualquer laço.
- **A transformação do BFF escala linearmente.** `toContrato` de 100 itens
  (~1,7 M ops/s) é ~27× mais lento que de 1 item (~46 M ops/s) — coerente com um
  `map` O(n) sem alocação surpresa por item.
- Os `resolveTarget` na casa de dezenas de milhões de ops/s confirmam que o
  roteamento por nome do Gateway (ADR-015) é desprezível frente ao hop de rede.

`npm run bench` **não** roda na esteira de CI hoje (é medição sob demanda);
promovê-lo a um gate de regressão de desempenho é um passo futuro possível, com
tolerância definida sobre estes valores de referência.

## Consequências

- A esteira de CI executa `vitest run --coverage` e `playwright test` em cada pull request
- MSW deve ser mantido atualizado com os contratos da API de Clientes — desatualização leva a falsos positivos nos testes
- Arquivos de simulação ficam em `src/mocks/` e são carregados condicionalmente apenas em modo de desenvolvimento e testes (ver `src/main.tsx`)
