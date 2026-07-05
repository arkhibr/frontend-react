# BFF-emprestimo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o serviço `bffs/emprestimo/` — o BFF do MFE de empréstimo, que transforma **todos** os endpoints legados (PascalCase) em um contrato limpo (camelCase) — e migrar `mfes/emprestimo` para consumir esse contrato novo, eliminando por completo a camada de DTOs/mappers hoje existente no cliente.

**Architecture:** Serviço Express 5 independente, mesmo padrão de `gateway/` e `bffs/endereco/` (próprio `package.json`, roda via `node --experimental-strip-types`, porta padrão `4001` — já é o default de `BFF_EMPRESTIMO_URL` no Gateway). Internamente: `legacyBackend.ts` simula o back-end legado (fixtures JSON próprias do pacote + a lógica de criação de proposta em memória, portada fielmente do handler MSW `src/mocks/handlers/emprestimo.ts`); `transform.ts` converte cada tipo legado (PascalCase) para o tipo limpo correspondente em `domain.ts` (camelCase) — é a mesma lógica hoje em `mfes/emprestimo/src/mappers/index.ts`, só que rodando no BFF em vez do cliente; rotas por área de domínio (`routes/contratos.ts`, `routes/propostas.ts`, `routes/consultas.ts`, `routes/simulacao.ts`, `routes/termos.ts`) expõem o contrato limpo. `domain.ts` deste pacote é uma cópia própria e independente do `domain/index.ts` do MFE — os dois pacotes não compartilham código (sem workspaces), só o contrato de wire.

Do lado do MFE: `mfes/emprestimo/src/dto/index.ts` e `mfes/emprestimo/src/mappers/index.ts` são **deletados por completo** (sem shim de compatibilidade); `domain/index.ts` ganha os tipos novos que faltavam (para os endpoints que hoje não tinham um tipo de domínio, como parâmetros de simulação ou termo de consentimento); `api/endpoints.ts` é reescrito para chamar as rotas novas do BFF e retornar tipos de `domain` diretamente; as telas que hoje chamam `mappers` (`ContratosPropostas.tsx`, `consultas.tsx`, `Contrato.tsx`, `Simulador.tsx`, `ResultadoEnvio.tsx`) passam a usar o retorno da API sem remapear.

Onde o DTO legado era "um objeto-wrapper com um único array realmente consumido" (extrato → `MovimentoDeEmprestimo`, previsão → `Parcelas`, atraso → `ParcelasEmAtraso`, parâmetros de simulação → `LinhasDeEmprestimo`, simulações múltiplas → `PrevisoesDeParcelas`), o BFF devolve o array já achatado — elimina o wrapper que hoje só existia para ser imediatamente descartado na tela.

**Tech Stack:** Node.js (`node --experimental-strip-types`), TypeScript, Express 5, Vitest, `supertest`.

## Global Constraints

- Pacote independente: próprio `package.json`, próprio `node_modules`, sem npm workspaces.
- Cobertura de teste ≥80% (lines/functions/branches/statements) em `bffs/emprestimo/` **e** mantida em `mfes/emprestimo/` após a migração.
- Testes em pastas `__tests__` coladas ao código.
- Imports relativos com extensão `.ts` explícita.
- Sem placeholders: todo arquivo criado/editado abaixo tem conteúdo completo.
- Este BFF roda atrás do Gateway do plano `2026-07-05-gateway-core.md` — suas rotas não incluem o prefixo `/bff/emprestimo` (o Gateway já removeu esse prefixo antes de encaminhar).
- Nenhum campo é inventado além do que é efetivamente lido ou escrito por algum ponto de consumo real (tela, hook ou o próprio `legacyBackend`) — DTOs legados com dezenas de campos opcionais não usados por nenhuma tela não viram campos no `domain.ts` novo.
- Sem tratamento de retrocompatibilidade: `dto/index.ts` e `mappers/index.ts` do MFE são removidos por completo, não deprecados.

---

### Task 1: Scaffold do pacote `bffs/emprestimo/` + configuração

**Files:**
- Create: `bffs/emprestimo/package.json`
- Create: `bffs/emprestimo/tsconfig.json`
- Create: `bffs/emprestimo/vitest.config.ts`
- Create: `bffs/emprestimo/src/config.ts`
- Test: `bffs/emprestimo/src/__tests__/config.test.ts`

**Interfaces:**
- Produces: `export interface BffConfig { port: number }` e `export function loadConfig(env?: NodeJS.ProcessEnv): BffConfig` — usados pelo bootstrap (Task 9).

- [ ] **Step 1: Criar `bffs/emprestimo/package.json`**

```json
{
  "name": "bff-emprestimo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --experimental-strip-types --watch src/index.ts",
    "start": "node --experimental-strip-types src/index.ts",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "^24.12.3",
    "@types/supertest": "^6.0.3",
    "@vitest/coverage-v8": "^4.1.7",
    "supertest": "^7.1.1",
    "typescript": "~6.0.2",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Criar `bffs/emprestimo/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Criar `bffs/emprestimo/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: ['src/**/__tests__/**', 'src/index.ts', 'src/domain.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
```

- [ ] **Step 4: Instalar dependências**

Run: `cd bffs/emprestimo && npm install`
Expected: instala sem erros, cria `bffs/emprestimo/node_modules` e `bffs/emprestimo/package-lock.json`.

- [ ] **Step 5: Escrever o teste que falha**

Create `bffs/emprestimo/src/__tests__/config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config.ts'

describe('loadConfig', () => {
  it('usa a porta padrão quando PORT não é definida', () => {
    expect(loadConfig({}).port).toBe(4001)
  })

  it('usa PORT quando definida', () => {
    expect(loadConfig({ PORT: '9001' }).port).toBe(9001)
  })
})
```

- [ ] **Step 6: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/config.test.ts`
Expected: FAIL — `Cannot find module '../config.ts'`.

- [ ] **Step 7: Criar `bffs/emprestimo/src/config.ts`**

```typescript
export interface BffConfig {
  port: number
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  return {
    port: Number(env.PORT ?? 4001),
  }
}
```

- [ ] **Step 8: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/config.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 9: Commit**

```bash
git add bffs/emprestimo/package.json bffs/emprestimo/package-lock.json bffs/emprestimo/tsconfig.json bffs/emprestimo/vitest.config.ts bffs/emprestimo/src/config.ts bffs/emprestimo/src/__tests__/config.test.ts
git commit -m "feat(bff-emprestimo): scaffold do pacote e configuração via env vars"
```

---

### Task 2: Back-end legado simulado (`legacyBackend.ts`)

**Files:**
- Create: `bffs/emprestimo/src/fixtures/contratos.list.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/contratos.detail.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/propostas.list.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/extrato.by-period.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/previsao.by-contract.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/detalhamento.by-contract.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/atraso.by-contract.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/simulacao.parametros.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/simulacao.primeiro-vencimento.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/simulacao.multiplas.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/termo.proposta-web.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/termo.compartilhamento.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/termo.dados-cadastrais.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/dataprev.dados-trabalhador.json` (cópia)
- Create: `bffs/emprestimo/src/fixtures/propostas.insert.json` (cópia)
- Create: `bffs/emprestimo/src/legacyBackend.ts`
- Test: `bffs/emprestimo/src/__tests__/legacyBackend.test.ts`

**Interfaces:**
- Consumes: nenhum.
- Produces: os tipos legados (`ContratoLegacy`, `PropostaLegacy`, `ParcelaEmAtrasoLegacy`, `MovimentoLegacy`, `ParcelaPrevistaLegacy`, `ParcelaDetalheLegacy`, `LinhaDeCreditoLegacy`, `EmprestimoSimuladoLegacy`, `TermoLegacy`, `DadosTrabalhadorLegacy`, `DataVencimentoLegacy`, `PropostaMockInput`) e as funções `listarContratos`, `obterContrato`, `listarPropostas`, `excluirProposta`, `criarProposta`, `respostaInsercaoProposta`, `resetPropostasEmMemoria`, `obterExtrato`, `obterPrevisao`, `obterDetalhamento`, `obterAtraso`, `obterParametrosSimulacao`, `obterPrimeiroVencimento`, `simularMultiplas`, `obterTermo`, `preencherVariaveis`, `assinarTermo`, `obterDadosTrabalhador` — consumidos por `transform.ts` (Task 3) e por todas as rotas (Tasks 4–8).

- [ ] **Step 1: Copiar os fixtures**

```bash
mkdir -p bffs/emprestimo/src/fixtures
cp src/mocks/fixtures/emprestimo/contratos.list.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/contratos.detail.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/propostas.list.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/extrato.by-period.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/previsao.by-contract.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/detalhamento.by-contract.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/atraso.by-contract.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/simulacao.parametros.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/simulacao.primeiro-vencimento.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/simulacao.multiplas.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/termo.proposta-web.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/termo.compartilhamento.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/termo.dados-cadastrais.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/dataprev.dados-trabalhador.json bffs/emprestimo/src/fixtures/
cp src/mocks/fixtures/emprestimo/propostas.insert.json bffs/emprestimo/src/fixtures/
```

- [ ] **Step 2: Escrever o teste que falha**

Create `bffs/emprestimo/src/__tests__/legacyBackend.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import {
  listarContratos, obterContrato, listarPropostas, excluirProposta,
  criarProposta, respostaInsercaoProposta, resetPropostasEmMemoria,
  obterExtrato, obterPrevisao, obterDetalhamento, obterAtraso,
  obterParametrosSimulacao, obterPrimeiroVencimento, simularMultiplas,
  obterTermo, preencherVariaveis, assinarTermo, obterDadosTrabalhador,
} from '../legacyBackend.ts'

beforeEach(() => resetPropostasEmMemoria())

describe('legacyBackend — contratos', () => {
  it('listarContratos retorna os dois contratos do fixture', () => {
    const contratos = listarContratos()
    expect(contratos).toHaveLength(2)
    expect(contratos[0]).toMatchObject({ Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal' })
    expect(contratos[1]).toMatchObject({ Contrato: '654321-0', TemParcelasEmAtraso: true })
  })

  it('obterContrato retorna o detalhe fixo independente do id', () => {
    expect(obterContrato('qualquer-id').Contrato).toBe('123456-7')
    expect(obterContrato('outro-id').Contrato).toBe('123456-7')
  })
})

describe('legacyBackend — propostas', () => {
  it('listarPropostas retorna a proposta do fixture', () => {
    const propostas = listarPropostas()
    expect(propostas).toHaveLength(1)
    expect(propostas[0]).toMatchObject({ Contrato: 'PRP-2026-0001', StatusDaProposta: { Value: 'Pendente' } })
  })

  it('excluirProposta remove a proposta e retorna true; retorna false se não existir', () => {
    expect(excluirProposta('PRP-2026-0001')).toBe(true)
    expect(listarPropostas()).toHaveLength(0)
    expect(excluirProposta('PRP-2026-0001')).toBe(false)
  })

  it('criarProposta calcula ValorBruto e ValorPrevistoDaPrimeiraParcela e gera o primeiro número de contrato', () => {
    const proposta = criarProposta({
      LinhaCredito: 205, ValorLiquido: 10000, NumeroParcelas: 24, DataLiberacao: '2026-06-30',
    })

    expect(proposta.Contrato).toBe('PRP-2026-0102')
    expect(proposta.DescricaoDaLinha).toBe('Refinanciamento Consignado')
    expect(proposta.TaxaDeJuros).toBe(1.39)
    expect(proposta.ValorBruto).toBe(10800)
    expect(proposta.DataDeEmissao).toBe('2026-06-30T12:00:00')
    expect(proposta.StatusDaProposta).toEqual({ Value: 'Pendente' })
    expect(listarPropostas()).toHaveLength(2)
  })

  it('respostaInsercaoProposta usa o número do contrato gerado', () => {
    expect(respostaInsercaoProposta('PRP-2026-0102')).toEqual({ numeroDoContrato: 'PRP-2026-0102' })
  })
})

describe('legacyBackend — consultas', () => {
  it('obterExtrato retorna os movimentos do fixture', () => {
    const movimentos = obterExtrato()
    expect(movimentos).toHaveLength(2)
    expect(movimentos[0]).toMatchObject({ TipoLancamento: 'Debito', Historico: 'Prestação mensal', Valor: 944.3 })
  })

  it('obterPrevisao retorna as parcelas do fixture', () => {
    expect(obterPrevisao()).toEqual([expect.objectContaining({ NumeroDaParcela: 11, ValorDaPrestacao: 944.3 })])
  })

  it('obterDetalhamento retorna as parcelas detalhadas do fixture', () => {
    expect(obterDetalhamento()).toEqual([expect.objectContaining({ NumeroDaParcela: 10, StatusDaParcela: 'Quitada' })])
  })

  it('obterAtraso retorna as parcelas em atraso do fixture', () => {
    expect(obterAtraso()).toEqual([expect.objectContaining({ NumeroDoContrato: '654321-0', ValorDaPrestacao: 615.8 })])
  })
})

describe('legacyBackend — simulação e termos', () => {
  it('obterParametrosSimulacao retorna as linhas de crédito do fixture', () => {
    expect(obterParametrosSimulacao()).toEqual([expect.objectContaining({ CodigoDaLinha: 205, CreditoDoTrabalhador: true })])
  })

  it('obterPrimeiroVencimento retorna o fixture completo', () => {
    expect(obterPrimeiroVencimento().DataDeVencimentoInicial).toBe('2026-08-05')
  })

  it('simularMultiplas retorna as previsões do fixture', () => {
    expect(simularMultiplas()).toEqual([expect.objectContaining({ CET: 1.74, TotalDoValorDasParcelas: 15480 })])
  })

  it('obterTermo retorna o termo correspondente ao tipo', () => {
    expect(obterTermo('PropostaWeb').TipoDoTermo).toBe('PROPOSTA_WEB')
    expect(obterTermo('AutorizacaoConsultaDadosDoTrabalhador').TipoDoTermo).toBe('TERMO_COMPARTILHAMENTO')
    expect(obterTermo('CONSENTIMENTO_DADOS_CADASTRAIS').TipoDoTermo).toBe('CONSENTIMENTO_DADOS_CADASTRAIS')
  })

  it('preencherVariaveis e assinarTermo replicam o comportamento fixo do handler MSW', () => {
    expect(preencherVariaveis()).toBe('Texto do termo preenchido.')
    expect(assinarTermo()).toBe(true)
  })

  it('obterDadosTrabalhador retorna o fixture', () => {
    expect(obterDadosTrabalhador()).toEqual({
      PossuiAutorizacaoParaConsulta: true, ValorBaseMargem: 1800, ValorMargemDisponivel: 980.5,
    })
  })
})
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/legacyBackend.test.ts`
Expected: FAIL — `Cannot find module '../legacyBackend.ts'`.

- [ ] **Step 4: Criar `bffs/emprestimo/src/legacyBackend.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function readFixture<T>(filename: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, filename), 'utf-8')) as T
}

export interface ContratoLegacy {
  Contrato: string
  DescricaoDaLinha: string
  ValorLiberado: number
  SaldoAtual: number
  NumeroDeParcelas: number
  ParcelasRestantes: number
  TaxaDeJuros: number
  TaxaDaCETMensal?: number
  TaxaDaCETAnual?: number
  TemParcelasEmAtraso?: boolean
  ProximaParcela?: { Vencimento?: string; Valor?: number }
}

export interface PropostaLegacy {
  Contrato: string
  DescricaoDaLinha: string
  TaxaDeJuros: number
  DataDeEmissao: string
  ValorBruto: number
  ValorLiquido: number
  NumeroDeParcelas: number
  StatusDaProposta: { Value?: string }
}

export interface ParcelaEmAtrasoLegacy {
  NumeroDoContrato: string
  VencimentoDaParcela: string
  ValorDaPrestacao: number
  ValorDoSaldoAtual: number
  DataDoProximoVencimento: string
}

export interface MovimentoLegacy {
  TipoLancamento: 'Credito' | 'Debito'
  Data: string
  Historico: string
  Valor: number
  Saldo: number
}

export interface ParcelaPrevistaLegacy {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaPrestacao: number
  ValorDoSaldoAtual: number
}

export interface ParcelaDetalheLegacy {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaPrestacao: number
  StatusDaParcela?: string
}

export interface LinhaDeCreditoLegacy {
  CodigoDaLinha: number
  DescricaoDaLinha: string
  NumeroMinimoDeParcelas: number
  NumeroMaximoDeParcelas: number
  ValorMinimo: number
  ValorMaximo: number
  PercentualDaTaxaJuros: number
  CreditoDoTrabalhador?: boolean
}

export interface EmprestimoSimuladoLegacy {
  NumeroDeParcelas: number
  ValorBruto: number
  ValorLiquido: number
  CET: number
  CET_ANUAL: number
  TotalDoValorDasParcelas: number
}

export interface TermoLegacy {
  VersaoDoTermo?: number
  TipoDoTermo?: string
  TextoDoTermo?: string
  VariaveisDosTermos?: unknown
}

export interface DadosTrabalhadorLegacy {
  PossuiAutorizacaoParaConsulta?: boolean
  ValorBaseMargem?: number
  ValorMargemDisponivel?: number
}

export interface DataVencimentoLegacy {
  DataDeVencimentoInicial?: string
  ContratosAptosAoRefinanciamento?: unknown[]
}

export interface PropostaMockInput {
  ValorLiquido: number
  NumeroParcelas: number
  LinhaCredito: number
  DataLiberacao?: string
  Observacao?: string
}

const contratosList = readFixture<ContratoLegacy[]>('contratos.list.json')
const contratosDetail = readFixture<ContratoLegacy>('contratos.detail.json')
const propostasListFixture = readFixture<PropostaLegacy[]>('propostas.list.json')
const extratoFixture = readFixture<{ MovimentoDeEmprestimo?: MovimentoLegacy[] }>('extrato.by-period.json')
const previsaoFixture = readFixture<{ Parcelas: ParcelaPrevistaLegacy[] }>('previsao.by-contract.json')
const detalhamentoFixture = readFixture<ParcelaDetalheLegacy[]>('detalhamento.by-contract.json')
const atrasoFixture = readFixture<{ ParcelasEmAtraso: ParcelaEmAtrasoLegacy[] }>('atraso.by-contract.json')
const parametrosFixture = readFixture<{ LinhasDeEmprestimo: LinhaDeCreditoLegacy[] }>('simulacao.parametros.json')
const primeiroVencFixture = readFixture<DataVencimentoLegacy>('simulacao.primeiro-vencimento.json')
const multiplasFixture = readFixture<{ PrevisoesDeParcelas: EmprestimoSimuladoLegacy[] }>('simulacao.multiplas.json')
const termoPropostaFixture = readFixture<TermoLegacy>('termo.proposta-web.json')
const termoCompartFixture = readFixture<TermoLegacy>('termo.compartilhamento.json')
const termoCadastraisFixture = readFixture<TermoLegacy>('termo.dados-cadastrais.json')
const dataprevFixture = readFixture<DadosTrabalhadorLegacy>('dataprev.dados-trabalhador.json')
const propostaInsertFixture = readFixture<{ numeroDoContrato: string }>('propostas.insert.json')

const ANO_FIXTURE_PROPOSTA = 2026
const PRIMEIRO_NUMERO_PROPOSTA_GERADA = 102

let proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
let propostasEmMemoria: PropostaLegacy[] = propostasListFixture.map(clonarProposta)

function clonarProposta(proposta: PropostaLegacy): PropostaLegacy {
  return { ...proposta, StatusDaProposta: { ...proposta.StatusDaProposta } }
}

function gerarNumeroProposta(): string {
  const numero = String(proximoNumeroProposta).padStart(4, '0')
  proximoNumeroProposta += 1
  return `PRP-${ANO_FIXTURE_PROPOSTA}-${numero}`
}

export function resetPropostasEmMemoria(): void {
  proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
  propostasEmMemoria = propostasListFixture.map(clonarProposta)
}

export function listarContratos(): ContratoLegacy[] {
  return contratosList
}

export function obterContrato(_id: string): ContratoLegacy {
  return contratosDetail
}

export function listarPropostas(): PropostaLegacy[] {
  return propostasEmMemoria.map(clonarProposta)
}

export function excluirProposta(id: string): boolean {
  const totalAntes = propostasEmMemoria.length
  propostasEmMemoria = propostasEmMemoria.filter((p) => p.Contrato !== id)
  return propostasEmMemoria.length !== totalAntes
}

export function criarProposta(body: PropostaMockInput): PropostaLegacy {
  const linha = parametrosFixture.LinhasDeEmprestimo.find((item) => item.CodigoDaLinha === body.LinhaCredito)
  const valorLiquido = Number(body.ValorLiquido) || 0

  const proposta: PropostaLegacy = {
    Contrato: gerarNumeroProposta(),
    DescricaoDaLinha: linha?.DescricaoDaLinha ?? `Linha ${body.LinhaCredito}`,
    TaxaDeJuros: linha?.PercentualDaTaxaJuros ?? 0,
    DataDeEmissao: body.DataLiberacao != null ? `${body.DataLiberacao}T12:00:00` : new Date().toISOString(),
    ValorBruto: Number((valorLiquido * 1.08).toFixed(2)),
    ValorLiquido: valorLiquido,
    NumeroDeParcelas: Number(body.NumeroParcelas) || 1,
    StatusDaProposta: { Value: 'Pendente' },
  }
  propostasEmMemoria = [proposta, ...propostasEmMemoria]
  return proposta
}

export function respostaInsercaoProposta(numeroDoContrato: string): { numeroDoContrato: string } {
  return { ...propostaInsertFixture, numeroDoContrato }
}

export function obterExtrato(): MovimentoLegacy[] {
  return extratoFixture.MovimentoDeEmprestimo ?? []
}

export function obterPrevisao(): ParcelaPrevistaLegacy[] {
  return previsaoFixture.Parcelas
}

export function obterDetalhamento(): ParcelaDetalheLegacy[] {
  return detalhamentoFixture
}

export function obterAtraso(): ParcelaEmAtrasoLegacy[] {
  return atrasoFixture.ParcelasEmAtraso
}

export function obterParametrosSimulacao(): LinhaDeCreditoLegacy[] {
  return parametrosFixture.LinhasDeEmprestimo
}

export function obterPrimeiroVencimento(): DataVencimentoLegacy {
  return primeiroVencFixture
}

export function simularMultiplas(): EmprestimoSimuladoLegacy[] {
  return multiplasFixture.PrevisoesDeParcelas
}

export function obterTermo(
  tipo: 'PropostaWeb' | 'AutorizacaoConsultaDadosDoTrabalhador' | 'CONSENTIMENTO_DADOS_CADASTRAIS',
): TermoLegacy {
  if (tipo === 'AutorizacaoConsultaDadosDoTrabalhador') return termoCompartFixture
  if (tipo === 'CONSENTIMENTO_DADOS_CADASTRAIS') return termoCadastraisFixture
  return termoPropostaFixture
}

export function preencherVariaveis(): string {
  return 'Texto do termo preenchido.'
}

export function assinarTermo(): boolean {
  return true
}

export function obterDadosTrabalhador(): DadosTrabalhadorLegacy {
  return dataprevFixture
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/legacyBackend.test.ts`
Expected: PASS (13 testes).

- [ ] **Step 6: Commit**

```bash
git add bffs/emprestimo/src/fixtures bffs/emprestimo/src/legacyBackend.ts bffs/emprestimo/src/__tests__/legacyBackend.test.ts
git commit -m "feat(bff-emprestimo): back-end legado simulado (fixtures + lógica de propostas)"
```

---

### Task 3: Contrato limpo (`domain.ts`) e transformação (`transform.ts`)

**Files:**
- Create: `bffs/emprestimo/src/domain.ts`
- Create: `bffs/emprestimo/src/transform.ts`
- Test: `bffs/emprestimo/src/__tests__/transform.test.ts`

**Interfaces:**
- Consumes: os tipos `*Legacy` e `PropostaMockInput` de `legacyBackend.ts` (Task 2).
- Produces: os tipos de domínio (`Contrato`, `Proposta`, `ParcelaAtraso`, `Movimento`, `ParcelaPrevista`, `ParcelaDetalhe`, `LinhaDeCredito`, `EmprestimoSimulado`, `TermoConsentimento`, `DadosTrabalhador`, `DataVencimentoContratosAptos`, `SolicitacaoDeProposta`, `PropostaEnviada`, `SimulacaoRequest`, `AssinarTermoRequest`) e as funções `toContrato`, `toProposta`, `toParcelaAtraso`, `toMovimento`, `toParcelaPrevista`, `toParcelaDetalhe`, `toLinhaDeCredito`, `toEmprestimoSimulado`, `toTermoConsentimento`, `toDadosTrabalhador`, `toDataVencimentoContratosAptos`, `fromSolicitacaoDeProposta` — consumidos por todas as rotas (Tasks 4–8).

- [ ] **Step 1: Criar `bffs/emprestimo/src/domain.ts`**

```typescript
export interface Contrato {
  numero: string
  linhaDeCredito: string
  valorLiberado: number
  saldoAtual: number
  parcelas: number
  parcelasRestantes: number
  taxaDeJuros: number
  cetMensal: number
  cetAnual: number
  temAtraso: boolean
  proximaParcela: { vencimento: string; valor: number } | null
}

export interface Proposta {
  numero: string
  linhaDeCredito: string
  taxaDeJuros: number
  dataDeEmissao: string
  valorBruto: number
  valorLiquido: number
  parcelas: number
  status: string
}

export interface ParcelaAtraso {
  contrato: string
  vencimento: string
  valorPrestacao: number
  saldoAtual: number
  proximoVencimento: string
}

export interface Movimento {
  tipo: 'Credito' | 'Debito'
  data: string
  historico: string
  valor: number
  saldo: number
}

export interface ParcelaPrevista {
  numero: number
  vencimento: string
  prestacao: number
  saldoAtual: number
}

export interface ParcelaDetalhe {
  numero: number
  vencimento: string
  prestacao: number
  status: string
}

export interface LinhaDeCredito {
  id: number
  descricao: string
  numeroMinimoDeParcelas: number
  numeroMaximoDeParcelas: number
  valorMinimo: number
  valorMaximo: number
  percentualTaxaJuros: number
  creditoTrabalhador: boolean
}

export interface EmprestimoSimulado {
  parcelas: number
  valorBruto: number
  valorLiquido: number
  cet: number
  cetAnual: number
  totalDasParcelas: number
}

export interface TermoConsentimento {
  versaoDoTermo?: number
  tipoDoTermo?: string
  textoDoTermo?: string
  variaveisDosTermos?: unknown
}

export interface DadosTrabalhador {
  possuiAutorizacaoParaConsulta?: boolean
  valorBaseMargem?: number
  valorMargemDisponivel?: number
}

export interface DataVencimentoContratosAptos {
  dataDeVencimentoInicial?: string
  contratosAptosAoRefinanciamento?: unknown[]
}

export interface SolicitacaoDeProposta {
  valorLiquido: number
  numeroParcelas: number
  linhaCredito: number
  mesAnoVencimento?: string
  dataLiberacao?: string
  tipoDeVencimento?: number
  diaVencimento?: number
  numeroDaContaCorrenteParaLiberacaoDoCredito?: number
  numeroDeContratosDeEmprestimoParaRefinanciamento?: string[]
  observacao?: string
  assinaturaDoTermoDeInclusaoDeProposta?: {
    tipoDoTermoDeAceite?: string
    sistemaDeOrigem?: string
    textoDoTermoDeAceite?: string
  }
}

export interface PropostaEnviada {
  numeroDoContrato: string
}

export interface SimulacaoRequest {
  linhaDeCredito: number
  dataDeLiberacao?: string
  valorLiquido: number
  valorDaCad?: number
  numeroDeParcelas: number[]
  taxaContratual?: number
  tipoDeVencimento?: number
  diaDeVencimento?: number
  mesAnoDeVencimento?: string
  numeroDosContratosHaRefinanciar?: string[]
}

export interface AssinarTermoRequest {
  tipoDoTermoDeAceite: string
  sistemaDeOrigem: string
}
```

- [ ] **Step 2: Escrever o teste que falha**

Create `bffs/emprestimo/src/__tests__/transform.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  toContrato, toProposta, toParcelaAtraso, toMovimento, toParcelaPrevista,
  toParcelaDetalhe, toLinhaDeCredito, toEmprestimoSimulado, toTermoConsentimento,
  toDadosTrabalhador, toDataVencimentoContratosAptos, fromSolicitacaoDeProposta,
} from '../transform.ts'
import type { ContratoLegacy, PropostaLegacy, LinhaDeCreditoLegacy, EmprestimoSimuladoLegacy } from '../legacyBackend.ts'

describe('transform', () => {
  it('toContrato mapeia PascalCase → camelCase e achata proximaParcela', () => {
    const dto: ContratoLegacy = {
      Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal', ValorLiberado: 15000,
      SaldoAtual: 9245.5, NumeroDeParcelas: 24, ParcelasRestantes: 14, TaxaDeJuros: 1.89,
      TaxaDaCETMensal: 2.11, TaxaDaCETAnual: 28.7, TemParcelasEmAtraso: false,
      ProximaParcela: { Vencimento: '2026-07-10', Valor: 944.3 },
    }
    expect(toContrato(dto)).toEqual({
      numero: '123456-7', linhaDeCredito: 'Crédito Pessoal', valorLiberado: 15000,
      saldoAtual: 9245.5, parcelas: 24, parcelasRestantes: 14, taxaDeJuros: 1.89,
      cetMensal: 2.11, cetAnual: 28.7, temAtraso: false,
      proximaParcela: { vencimento: '2026-07-10', valor: 944.3 },
    })
  })

  it('toContrato trata proximaParcela ausente como null e opcionais faltantes como padrão', () => {
    const dto = {
      Contrato: 'X', DescricaoDaLinha: 'L', ValorLiberado: 0, SaldoAtual: 0,
      NumeroDeParcelas: 0, ParcelasRestantes: 0, TaxaDeJuros: 0,
    } as ContratoLegacy
    const c = toContrato(dto)
    expect(c.proximaParcela).toBeNull()
    expect(c.cetMensal).toBe(0)
    expect(c.cetAnual).toBe(0)
    expect(c.temAtraso).toBe(false)
  })

  it('toProposta extrai o status a partir de StatusDaProposta.Value', () => {
    const dto: PropostaLegacy = {
      Contrato: 'PRP-1', DescricaoDaLinha: 'Refin', TaxaDeJuros: 1.39, DataDeEmissao: '2026-06-20T10:15:00',
      ValorBruto: 12000, ValorLiquido: 10850, NumeroDeParcelas: 24, StatusDaProposta: { Value: 'Pendente' },
    }
    expect(toProposta(dto).status).toBe('Pendente')
  })

  it('toProposta usa — quando StatusDaProposta.Value é undefined', () => {
    const dto: PropostaLegacy = {
      Contrato: 'PRP-2', DescricaoDaLinha: 'X', TaxaDeJuros: 1, DataDeEmissao: '2026-01-01',
      ValorBruto: 1000, ValorLiquido: 900, NumeroDeParcelas: 12, StatusDaProposta: {},
    }
    expect(toProposta(dto).status).toBe('—')
  })

  it('toParcelaAtraso mapeia campos corretamente', () => {
    expect(toParcelaAtraso({
      NumeroDoContrato: '001-A', VencimentoDaParcela: '2026-05-05', ValorDaPrestacao: 500,
      ValorDoSaldoAtual: 4000, DataDoProximoVencimento: '2026-06-05',
    })).toEqual({ contrato: '001-A', vencimento: '2026-05-05', valorPrestacao: 500, saldoAtual: 4000, proximoVencimento: '2026-06-05' })
  })

  it('toMovimento mapeia campos corretamente', () => {
    expect(toMovimento({ TipoLancamento: 'Credito', Data: '2026-06-01', Historico: 'Crédito', Valor: 1000, Saldo: 5000 }))
      .toEqual({ tipo: 'Credito', data: '2026-06-01', historico: 'Crédito', valor: 1000, saldo: 5000 })
  })

  it('toParcelaPrevista mapeia campos corretamente', () => {
    expect(toParcelaPrevista({ NumeroDaParcela: 1, DataDeVencimento: '2026-07-05', ValorDaPrestacao: 450, ValorDoSaldoAtual: 9000 }))
      .toEqual({ numero: 1, vencimento: '2026-07-05', prestacao: 450, saldoAtual: 9000 })
  })

  it('toParcelaDetalhe usa — quando StatusDaParcela é undefined', () => {
    const r = toParcelaDetalhe({ NumeroDaParcela: 1, DataDeVencimento: '2026-07-05', ValorDaPrestacao: 450 })
    expect(r.status).toBe('—')
  })

  it('toLinhaDeCredito mapeia todos os campos', () => {
    const dto: LinhaDeCreditoLegacy = {
      CodigoDaLinha: 10, DescricaoDaLinha: 'Pessoal', NumeroMinimoDeParcelas: 6, NumeroMaximoDeParcelas: 48,
      ValorMinimo: 1000, ValorMaximo: 30000, PercentualDaTaxaJuros: 1.5, CreditoDoTrabalhador: true,
    }
    expect(toLinhaDeCredito(dto)).toEqual({
      id: 10, descricao: 'Pessoal', numeroMinimoDeParcelas: 6, numeroMaximoDeParcelas: 48,
      valorMinimo: 1000, valorMaximo: 30000, percentualTaxaJuros: 1.5, creditoTrabalhador: true,
    })
  })

  it('toLinhaDeCredito usa false quando CreditoDoTrabalhador é undefined', () => {
    const dto = {
      CodigoDaLinha: 1, DescricaoDaLinha: 'X', NumeroMinimoDeParcelas: 1, NumeroMaximoDeParcelas: 12,
      ValorMinimo: 100, ValorMaximo: 5000, PercentualDaTaxaJuros: 1,
    } as LinhaDeCreditoLegacy
    expect(toLinhaDeCredito(dto).creditoTrabalhador).toBe(false)
  })

  it('toEmprestimoSimulado mapeia campos corretamente', () => {
    const dto: EmprestimoSimuladoLegacy = {
      NumeroDeParcelas: 24, ValorBruto: 12000, ValorLiquido: 10000, CET: 1.74, CET_ANUAL: 23.01, TotalDoValorDasParcelas: 15480,
    }
    expect(toEmprestimoSimulado(dto)).toEqual({ parcelas: 24, valorBruto: 12000, valorLiquido: 10000, cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480 })
  })

  it('toTermoConsentimento mapeia todos os campos', () => {
    expect(toTermoConsentimento({
      VersaoDoTermo: 5, TipoDoTermo: 'PROPOSTA_WEB', TextoDoTermo: 'Texto', VariaveisDosTermos: { nomeCliente: 'João' },
    })).toEqual({ versaoDoTermo: 5, tipoDoTermo: 'PROPOSTA_WEB', textoDoTermo: 'Texto', variaveisDosTermos: { nomeCliente: 'João' } })
  })

  it('toDadosTrabalhador mapeia todos os campos', () => {
    expect(toDadosTrabalhador({ PossuiAutorizacaoParaConsulta: true, ValorBaseMargem: 1800, ValorMargemDisponivel: 980.5 }))
      .toEqual({ possuiAutorizacaoParaConsulta: true, valorBaseMargem: 1800, valorMargemDisponivel: 980.5 })
  })

  it('toDataVencimentoContratosAptos mapeia todos os campos', () => {
    expect(toDataVencimentoContratosAptos({ DataDeVencimentoInicial: '2026-08-05', ContratosAptosAoRefinanciamento: [] }))
      .toEqual({ dataDeVencimentoInicial: '2026-08-05', contratosAptosAoRefinanciamento: [] })
  })

  it('fromSolicitacaoDeProposta extrai só os campos que o back-end legado consome', () => {
    expect(fromSolicitacaoDeProposta({
      valorLiquido: 10000, numeroParcelas: 24, linhaCredito: 205, dataLiberacao: '2026-06-30',
      mesAnoVencimento: '08/2026', tipoDeVencimento: 2, diaVencimento: 5,
      numeroDaContaCorrenteParaLiberacaoDoCredito: 1001, observacao: 'obs',
    })).toEqual({
      ValorLiquido: 10000, NumeroParcelas: 24, LinhaCredito: 205, DataLiberacao: '2026-06-30', Observacao: 'obs',
    })
  })
})
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/transform.test.ts`
Expected: FAIL — `Cannot find module '../transform.ts'`.

- [ ] **Step 4: Criar `bffs/emprestimo/src/transform.ts`**

```typescript
import type {
  ContratoLegacy, PropostaLegacy, ParcelaEmAtrasoLegacy, MovimentoLegacy,
  ParcelaPrevistaLegacy, ParcelaDetalheLegacy, LinhaDeCreditoLegacy,
  EmprestimoSimuladoLegacy, TermoLegacy, DadosTrabalhadorLegacy, DataVencimentoLegacy,
  PropostaMockInput,
} from './legacyBackend.ts'
import type {
  Contrato, Proposta, ParcelaAtraso, Movimento, ParcelaPrevista, ParcelaDetalhe,
  LinhaDeCredito, EmprestimoSimulado, TermoConsentimento, DadosTrabalhador,
  DataVencimentoContratosAptos, SolicitacaoDeProposta,
} from './domain.ts'

export function toContrato(d: ContratoLegacy): Contrato {
  const p = d.ProximaParcela
  return {
    numero: d.Contrato,
    linhaDeCredito: d.DescricaoDaLinha,
    valorLiberado: d.ValorLiberado,
    saldoAtual: d.SaldoAtual,
    parcelas: d.NumeroDeParcelas,
    parcelasRestantes: d.ParcelasRestantes,
    taxaDeJuros: d.TaxaDeJuros,
    cetMensal: d.TaxaDaCETMensal ?? 0,
    cetAnual: d.TaxaDaCETAnual ?? 0,
    temAtraso: d.TemParcelasEmAtraso ?? false,
    proximaParcela: p?.Vencimento != null && p.Valor != null
      ? { vencimento: p.Vencimento, valor: p.Valor }
      : null,
  }
}

export function toProposta(d: PropostaLegacy): Proposta {
  return {
    numero: d.Contrato,
    linhaDeCredito: d.DescricaoDaLinha,
    taxaDeJuros: d.TaxaDeJuros,
    dataDeEmissao: d.DataDeEmissao,
    valorBruto: d.ValorBruto,
    valorLiquido: d.ValorLiquido,
    parcelas: d.NumeroDeParcelas,
    status: d.StatusDaProposta?.Value ?? '—',
  }
}

export function toParcelaAtraso(d: ParcelaEmAtrasoLegacy): ParcelaAtraso {
  return {
    contrato: d.NumeroDoContrato,
    vencimento: d.VencimentoDaParcela,
    valorPrestacao: d.ValorDaPrestacao,
    saldoAtual: d.ValorDoSaldoAtual,
    proximoVencimento: d.DataDoProximoVencimento,
  }
}

export const toMovimento = (d: MovimentoLegacy): Movimento => ({
  tipo: d.TipoLancamento, data: d.Data, historico: d.Historico, valor: d.Valor, saldo: d.Saldo,
})

export const toParcelaPrevista = (d: ParcelaPrevistaLegacy): ParcelaPrevista => ({
  numero: d.NumeroDaParcela, vencimento: d.DataDeVencimento,
  prestacao: d.ValorDaPrestacao, saldoAtual: d.ValorDoSaldoAtual,
})

export const toParcelaDetalhe = (d: ParcelaDetalheLegacy): ParcelaDetalhe => ({
  numero: d.NumeroDaParcela, vencimento: d.DataDeVencimento,
  prestacao: d.ValorDaPrestacao, status: d.StatusDaParcela ?? '—',
})

export const toLinhaDeCredito = (d: LinhaDeCreditoLegacy): LinhaDeCredito => ({
  id: d.CodigoDaLinha, descricao: d.DescricaoDaLinha,
  numeroMinimoDeParcelas: d.NumeroMinimoDeParcelas, numeroMaximoDeParcelas: d.NumeroMaximoDeParcelas,
  valorMinimo: d.ValorMinimo, valorMaximo: d.ValorMaximo,
  percentualTaxaJuros: d.PercentualDaTaxaJuros, creditoTrabalhador: d.CreditoDoTrabalhador ?? false,
})

export const toEmprestimoSimulado = (d: EmprestimoSimuladoLegacy): EmprestimoSimulado => ({
  parcelas: d.NumeroDeParcelas, valorBruto: d.ValorBruto, valorLiquido: d.ValorLiquido,
  cet: d.CET, cetAnual: d.CET_ANUAL, totalDasParcelas: d.TotalDoValorDasParcelas,
})

export const toTermoConsentimento = (d: TermoLegacy): TermoConsentimento => ({
  versaoDoTermo: d.VersaoDoTermo, tipoDoTermo: d.TipoDoTermo,
  textoDoTermo: d.TextoDoTermo, variaveisDosTermos: d.VariaveisDosTermos,
})

export const toDadosTrabalhador = (d: DadosTrabalhadorLegacy): DadosTrabalhador => ({
  possuiAutorizacaoParaConsulta: d.PossuiAutorizacaoParaConsulta,
  valorBaseMargem: d.ValorBaseMargem, valorMargemDisponivel: d.ValorMargemDisponivel,
})

export const toDataVencimentoContratosAptos = (d: DataVencimentoLegacy): DataVencimentoContratosAptos => ({
  dataDeVencimentoInicial: d.DataDeVencimentoInicial,
  contratosAptosAoRefinanciamento: d.ContratosAptosAoRefinanciamento,
})

export function fromSolicitacaoDeProposta(input: SolicitacaoDeProposta): PropostaMockInput {
  return {
    ValorLiquido: input.valorLiquido,
    NumeroParcelas: input.numeroParcelas,
    LinhaCredito: input.linhaCredito,
    DataLiberacao: input.dataLiberacao,
    Observacao: input.observacao,
  }
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/transform.test.ts`
Expected: PASS (16 testes).

- [ ] **Step 6: Commit**

```bash
git add bffs/emprestimo/src/domain.ts bffs/emprestimo/src/transform.ts bffs/emprestimo/src/__tests__/transform.test.ts
git commit -m "feat(bff-emprestimo): contrato limpo (domain.ts) e transformação PascalCase→camelCase"
```

---

### Task 4: Rotas de contratos

**Files:**
- Create: `bffs/emprestimo/src/routes/contratos.ts`
- Test: `bffs/emprestimo/src/routes/__tests__/contratos.test.ts`

**Interfaces:**
- Consumes: `listarContratos`, `obterContrato` (Task 2), `toContrato` (Task 3).
- Produces: `export function createContratosRouter(): Router` — montado por `app.ts` (Task 9).

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/emprestimo/src/routes/__tests__/contratos.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createContratosRouter } from '../contratos.ts'

function buildApp() {
  const app = express()
  app.use(createContratosRouter())
  return app
}

describe('rotas de contratos', () => {
  it('GET /contratos retorna a lista em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ numero: '123456-7', linhaDeCredito: 'Crédito Pessoal', saldoAtual: 9245.5 })
    expect(res.body[0].CodigoDaLinha).toBeUndefined()
    expect(res.body[1]).toMatchObject({ numero: '654321-0', temAtraso: true })
  })

  it('GET /contratos/:id retorna o detalhe em camelCase, independente do id', async () => {
    const res = await request(buildApp()).get('/contratos/qualquer-id')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      numero: '123456-7', saldoAtual: 9245.5,
      proximaParcela: { vencimento: '2026-07-10', valor: 944.3 },
    })
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/contratos.test.ts`
Expected: FAIL — `Cannot find module '../contratos.ts'`.

- [ ] **Step 3: Criar `bffs/emprestimo/src/routes/contratos.ts`**

```typescript
import { Router } from 'express'
import { listarContratos, obterContrato } from '../legacyBackend.ts'
import { toContrato } from '../transform.ts'

export function createContratosRouter(): Router {
  const router = Router()

  router.get('/contratos', (_req, res) => {
    res.json(listarContratos().map(toContrato))
  })

  router.get('/contratos/:id', (req, res) => {
    res.json(toContrato(obterContrato(req.params.id)))
  })

  return router
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/contratos.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add bffs/emprestimo/src/routes/contratos.ts bffs/emprestimo/src/routes/__tests__/contratos.test.ts
git commit -m "feat(bff-emprestimo): rotas GET /contratos e GET /contratos/:id"
```

---

### Task 5: Rotas de propostas

**Files:**
- Create: `bffs/emprestimo/src/routes/propostas.ts`
- Test: `bffs/emprestimo/src/routes/__tests__/propostas.test.ts`

**Interfaces:**
- Consumes: `listarPropostas`, `excluirProposta`, `criarProposta`, `respostaInsercaoProposta`, `resetPropostasEmMemoria` (Task 2), `toProposta`, `fromSolicitacaoDeProposta` (Task 3), `SolicitacaoDeProposta` (Task 3).
- Produces: `export function createPropostasRouter(): Router` — montado por `app.ts` (Task 9).

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/emprestimo/src/routes/__tests__/propostas.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createPropostasRouter } from '../propostas.ts'
import { resetPropostasEmMemoria } from '../../legacyBackend.ts'

beforeEach(() => resetPropostasEmMemoria())

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(createPropostasRouter())
  return app
}

describe('rotas de propostas', () => {
  it('GET /propostas retorna a lista em camelCase', async () => {
    const res = await request(buildApp()).get('/propostas')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      numero: 'PRP-2026-0001', linhaDeCredito: 'Refinanciamento Consignado', taxaDeJuros: 1.39,
      dataDeEmissao: '2026-06-20T10:15:00', valorBruto: 12000, valorLiquido: 10850,
      parcelas: 24, status: 'Pendente',
    }])
  })

  it('DELETE /propostas/:id remove a proposta e retorna true; false se não existir', async () => {
    const app = buildApp()
    const res1 = await request(app).delete('/propostas/PRP-2026-0001')
    expect(res1.status).toBe(200)
    expect(res1.body).toBe(true)

    const res2 = await request(app).delete('/propostas/PRP-2026-0001')
    expect(res2.body).toBe(false)
  })

  it('POST /propostas cria a proposta a partir do corpo em camelCase', async () => {
    const app = buildApp()
    const res = await request(app).post('/propostas').send({
      valorLiquido: 10000, numeroParcelas: 24, linhaCredito: 205, dataLiberacao: '2026-06-30',
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ numeroDoContrato: 'PRP-2026-0102' })

    const lista = await request(app).get('/propostas')
    expect(lista.body).toHaveLength(2)
    expect(lista.body[0]).toMatchObject({ numero: 'PRP-2026-0102', valorBruto: 10800 })
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/propostas.test.ts`
Expected: FAIL — `Cannot find module '../propostas.ts'`.

- [ ] **Step 3: Criar `bffs/emprestimo/src/routes/propostas.ts`**

```typescript
import { Router } from 'express'
import { criarProposta, excluirProposta, listarPropostas, respostaInsercaoProposta } from '../legacyBackend.ts'
import { fromSolicitacaoDeProposta, toProposta } from '../transform.ts'
import type { SolicitacaoDeProposta } from '../domain.ts'

export function createPropostasRouter(): Router {
  const router = Router()

  router.get('/propostas', (_req, res) => {
    res.json(listarPropostas().map(toProposta))
  })

  router.delete('/propostas/:id', (req, res) => {
    res.json(excluirProposta(req.params.id))
  })

  router.post('/propostas', (req, res) => {
    const body = req.body as SolicitacaoDeProposta
    const proposta = criarProposta(fromSolicitacaoDeProposta(body))
    res.json(respostaInsercaoProposta(proposta.Contrato))
  })

  return router
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/propostas.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add bffs/emprestimo/src/routes/propostas.ts bffs/emprestimo/src/routes/__tests__/propostas.test.ts
git commit -m "feat(bff-emprestimo): rotas GET/DELETE/POST /propostas"
```

---

### Task 6: Rotas de consultas (extrato, previsão, parcelas, atraso)

**Files:**
- Create: `bffs/emprestimo/src/routes/consultas.ts`
- Test: `bffs/emprestimo/src/routes/__tests__/consultas.test.ts`

**Interfaces:**
- Consumes: `obterExtrato`, `obterPrevisao`, `obterDetalhamento`, `obterAtraso` (Task 2), `toMovimento`, `toParcelaPrevista`, `toParcelaDetalhe`, `toParcelaAtraso` (Task 3).
- Produces: `export function createConsultasRouter(): Router` — montado por `app.ts` (Task 9).

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/emprestimo/src/routes/__tests__/consultas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createConsultasRouter } from '../consultas.ts'

function buildApp() {
  const app = express()
  app.use(createConsultasRouter())
  return app
}

describe('rotas de consultas', () => {
  it('GET /contratos/:id/extrato retorna os movimentos em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/123456-7/extrato?inicio=2026-05-30&fim=2026-06-29')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toEqual({ tipo: 'Debito', data: '2026-06-10', historico: 'Prestação mensal', valor: 944.3, saldo: 10189.8 })
  })

  it('GET /contratos/:id/previsao retorna as parcelas previstas em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/123456-7/previsao')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ numero: 11, vencimento: '2026-07-10', prestacao: 944.3, saldoAtual: 9245.5 }])
  })

  it('GET /contratos/:id/parcelas retorna o detalhamento em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/123456-7/parcelas')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ numero: 10, vencimento: '2026-06-10', prestacao: 944.3, status: 'Quitada' }])
  })

  it('GET /contratos/:id/atraso retorna as parcelas em atraso em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/654321-0/atraso')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ contrato: '654321-0', vencimento: '2026-05-05', valorPrestacao: 615.8, saldoAtual: 4320.12, proximoVencimento: '2026-07-05' }])
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/consultas.test.ts`
Expected: FAIL — `Cannot find module '../consultas.ts'`.

- [ ] **Step 3: Criar `bffs/emprestimo/src/routes/consultas.ts`**

```typescript
import { Router } from 'express'
import { obterAtraso, obterDetalhamento, obterExtrato, obterPrevisao } from '../legacyBackend.ts'
import { toMovimento, toParcelaAtraso, toParcelaDetalhe, toParcelaPrevista } from '../transform.ts'

export function createConsultasRouter(): Router {
  const router = Router()

  router.get('/contratos/:id/extrato', (_req, res) => {
    res.json(obterExtrato().map(toMovimento))
  })

  router.get('/contratos/:id/previsao', (_req, res) => {
    res.json(obterPrevisao().map(toParcelaPrevista))
  })

  router.get('/contratos/:id/parcelas', (_req, res) => {
    res.json(obterDetalhamento().map(toParcelaDetalhe))
  })

  router.get('/contratos/:id/atraso', (_req, res) => {
    res.json(obterAtraso().map(toParcelaAtraso))
  })

  return router
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/consultas.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add bffs/emprestimo/src/routes/consultas.ts bffs/emprestimo/src/routes/__tests__/consultas.test.ts
git commit -m "feat(bff-emprestimo): rotas de consulta (extrato, previsão, parcelas, atraso)"
```

---

### Task 7: Rotas de simulação

**Files:**
- Create: `bffs/emprestimo/src/routes/simulacao.ts`
- Test: `bffs/emprestimo/src/routes/__tests__/simulacao.test.ts`

**Interfaces:**
- Consumes: `obterParametrosSimulacao`, `obterPrimeiroVencimento`, `simularMultiplas` (Task 2), `toLinhaDeCredito`, `toDataVencimentoContratosAptos`, `toEmprestimoSimulado` (Task 3).
- Produces: `export function createSimulacaoRouter(): Router` — montado por `app.ts` (Task 9).

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/emprestimo/src/routes/__tests__/simulacao.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createSimulacaoRouter } from '../simulacao.ts'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(createSimulacaoRouter())
  return app
}

describe('rotas de simulação', () => {
  it('GET /simulacao/parametros retorna as linhas de crédito em camelCase', async () => {
    const res = await request(buildApp()).get('/simulacao/parametros')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      id: 205, descricao: 'Refinanciamento Consignado', numeroMinimoDeParcelas: 12, numeroMaximoDeParcelas: 48,
      valorMinimo: 3000, valorMaximo: 50000, percentualTaxaJuros: 1.39, creditoTrabalhador: true,
    }])
  })

  it('GET /simulacao/primeiro-vencimento retorna o resultado em camelCase', async () => {
    const res = await request(buildApp()).get('/simulacao/primeiro-vencimento?cl=205&tv=2&dv=5&dl=1&dr=1')

    expect(res.status).toBe(200)
    expect(res.body.dataDeVencimentoInicial).toBe('2026-08-05')
    expect(res.body.contratosAptosAoRefinanciamento).toHaveLength(1)
  })

  it('POST /simulacao/multiplas retorna os cenários em camelCase', async () => {
    const res = await request(buildApp()).post('/simulacao/multiplas').send({
      linhaDeCredito: 205, valorLiquido: 10000, numeroDeParcelas: [24],
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ parcelas: 24, valorBruto: 11250, valorLiquido: 10000, cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480 }])
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/simulacao.test.ts`
Expected: FAIL — `Cannot find module '../simulacao.ts'`.

- [ ] **Step 3: Criar `bffs/emprestimo/src/routes/simulacao.ts`**

```typescript
import { Router } from 'express'
import { obterParametrosSimulacao, obterPrimeiroVencimento, simularMultiplas } from '../legacyBackend.ts'
import { toDataVencimentoContratosAptos, toEmprestimoSimulado, toLinhaDeCredito } from '../transform.ts'

export function createSimulacaoRouter(): Router {
  const router = Router()

  router.get('/simulacao/parametros', (_req, res) => {
    res.json(obterParametrosSimulacao().map(toLinhaDeCredito))
  })

  router.get('/simulacao/primeiro-vencimento', (_req, res) => {
    res.json(toDataVencimentoContratosAptos(obterPrimeiroVencimento()))
  })

  router.post('/simulacao/multiplas', (_req, res) => {
    res.json(simularMultiplas().map(toEmprestimoSimulado))
  })

  return router
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/simulacao.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add bffs/emprestimo/src/routes/simulacao.ts bffs/emprestimo/src/routes/__tests__/simulacao.test.ts
git commit -m "feat(bff-emprestimo): rotas de simulação (parâmetros, primeiro vencimento, múltiplas)"
```

---

### Task 8: Rotas de termos e dados do trabalhador

**Files:**
- Create: `bffs/emprestimo/src/routes/termos.ts`
- Test: `bffs/emprestimo/src/routes/__tests__/termos.test.ts`

**Interfaces:**
- Consumes: `obterTermo`, `preencherVariaveis`, `assinarTermo`, `obterDadosTrabalhador` (Task 2), `toTermoConsentimento`, `toDadosTrabalhador` (Task 3).
- Produces: `export function createTermosRouter(): Router` — montado por `app.ts` (Task 9).

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/emprestimo/src/routes/__tests__/termos.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createTermosRouter } from '../termos.ts'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(createTermosRouter())
  return app
}

describe('rotas de termos', () => {
  it('GET /termos/:tipo retorna o termo em camelCase para cada tipo válido', async () => {
    const proposta = await request(buildApp()).get('/termos/PropostaWeb')
    expect(proposta.body).toMatchObject({ tipoDoTermo: 'PROPOSTA_WEB' })

    const compart = await request(buildApp()).get('/termos/AutorizacaoConsultaDadosDoTrabalhador')
    expect(compart.body).toMatchObject({ tipoDoTermo: 'TERMO_COMPARTILHAMENTO' })

    const cadastrais = await request(buildApp()).get('/termos/CONSENTIMENTO_DADOS_CADASTRAIS')
    expect(cadastrais.body).toMatchObject({ tipoDoTermo: 'CONSENTIMENTO_DADOS_CADASTRAIS' })
  })

  it('GET /termos/:tipo responde 404 para um tipo desconhecido', async () => {
    const res = await request(buildApp()).get('/termos/TipoInexistente')
    expect(res.status).toBe(404)
  })

  it('POST /termos/preencher-variaveis retorna o texto fixo', async () => {
    const res = await request(buildApp()).post('/termos/preencher-variaveis').send({ tipoDoTermo: 'PROPOSTA_WEB' })
    expect(res.status).toBe(200)
    expect(res.body).toBe('Texto do termo preenchido.')
  })

  it('POST /termos/assinar retorna true', async () => {
    const res = await request(buildApp()).post('/termos/assinar').send({ tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB' })
    expect(res.status).toBe(200)
    expect(res.body).toBe(true)
  })

  it('GET /dados-trabalhador retorna os dados em camelCase', async () => {
    const res = await request(buildApp()).get('/dados-trabalhador')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ possuiAutorizacaoParaConsulta: true, valorBaseMargem: 1800, valorMargemDisponivel: 980.5 })
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/termos.test.ts`
Expected: FAIL — `Cannot find module '../termos.ts'`.

- [ ] **Step 3: Criar `bffs/emprestimo/src/routes/termos.ts`**

```typescript
import { Router } from 'express'
import { assinarTermo, obterDadosTrabalhador, obterTermo, preencherVariaveis } from '../legacyBackend.ts'
import { toDadosTrabalhador, toTermoConsentimento } from '../transform.ts'

const TIPOS_DE_TERMO = ['PropostaWeb', 'AutorizacaoConsultaDadosDoTrabalhador', 'CONSENTIMENTO_DADOS_CADASTRAIS'] as const
type TipoDeTermo = (typeof TIPOS_DE_TERMO)[number]

function isTipoDeTermo(valor: string): valor is TipoDeTermo {
  return (TIPOS_DE_TERMO as readonly string[]).includes(valor)
}

export function createTermosRouter(): Router {
  const router = Router()

  router.get('/termos/:tipo', (req, res) => {
    if (!isTipoDeTermo(req.params.tipo)) {
      res.status(404).json({ error: 'not_found', message: 'Tipo de termo desconhecido.' })
      return
    }
    res.json(toTermoConsentimento(obterTermo(req.params.tipo)))
  })

  router.post('/termos/preencher-variaveis', (_req, res) => {
    res.json(preencherVariaveis())
  })

  router.post('/termos/assinar', (_req, res) => {
    res.json(assinarTermo())
  })

  router.get('/dados-trabalhador', (_req, res) => {
    res.json(toDadosTrabalhador(obterDadosTrabalhador()))
  })

  return router
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/routes/__tests__/termos.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add bffs/emprestimo/src/routes/termos.ts bffs/emprestimo/src/routes/__tests__/termos.test.ts
git commit -m "feat(bff-emprestimo): rotas de termos de consentimento e dados do trabalhador"
```

---

### Task 9: Montagem do app, bootstrap, README e smoke test com o Gateway

**Files:**
- Create: `bffs/emprestimo/src/app.ts`
- Create: `bffs/emprestimo/src/index.ts`
- Create: `bffs/emprestimo/README.md`
- Test: `bffs/emprestimo/src/__tests__/app.test.ts`

**Interfaces:**
- Consumes: `createContratosRouter` (Task 4), `createPropostasRouter` (Task 5), `createConsultasRouter` (Task 6), `createSimulacaoRouter` (Task 7), `createTermosRouter` (Task 8), `loadConfig` (Task 1).
- Produces: `export function createApp(): Application` e o processo HTTP em `config.port` — este é o serviço que o Gateway (`BFF_EMPRESTIMO_URL`, padrão `http://localhost:4001`) encaminha requisições `/bff/emprestimo/*`.

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/emprestimo/src/__tests__/app.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.ts'
import { resetPropostasEmMemoria } from '../legacyBackend.ts'

beforeEach(() => resetPropostasEmMemoria())

describe('createApp', () => {
  it('compõe todas as rotas de domínio num único app', async () => {
    const app = createApp()

    const contratos = await request(app).get('/contratos')
    expect(contratos.status).toBe(200)

    const propostas = await request(app).get('/propostas')
    expect(propostas.status).toBe(200)

    const parametros = await request(app).get('/simulacao/parametros')
    expect(parametros.status).toBe(200)

    const termo = await request(app).get('/termos/PropostaWeb')
    expect(termo.status).toBe(200)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/app.test.ts`
Expected: FAIL — `Cannot find module '../app.ts'`.

- [ ] **Step 3: Criar `bffs/emprestimo/src/app.ts`**

```typescript
import express from 'express'
import type { Application } from 'express'
import { createConsultasRouter } from './routes/consultas.ts'
import { createContratosRouter } from './routes/contratos.ts'
import { createPropostasRouter } from './routes/propostas.ts'
import { createSimulacaoRouter } from './routes/simulacao.ts'
import { createTermosRouter } from './routes/termos.ts'

export function createApp(): Application {
  const app = express()
  app.use(express.json())
  app.use(createContratosRouter())
  app.use(createPropostasRouter())
  app.use(createConsultasRouter())
  app.use(createSimulacaoRouter())
  app.use(createTermosRouter())
  return app
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd bffs/emprestimo && npx vitest run src/__tests__/app.test.ts`
Expected: PASS (1 teste).

- [ ] **Step 5: Criar `bffs/emprestimo/src/index.ts`**

```typescript
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp()

app.listen(config.port, () => {
  console.log(`BFF-emprestimo ouvindo em http://localhost:${config.port}`)
})
```

- [ ] **Step 6: Rodar a suíte completa e checar cobertura**

Run: `cd bffs/emprestimo && npm run test:coverage`
Expected: todos os testes PASS; cobertura ≥80% em lines/functions/branches/statements.

- [ ] **Step 7: Checar tipos**

Run: `cd bffs/emprestimo && npm run type-check`
Expected: sem erros.

- [ ] **Step 8: Criar `bffs/emprestimo/README.md`**

```markdown
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
```

- [ ] **Step 9: Commit**

```bash
git add bffs/emprestimo/src/app.ts bffs/emprestimo/src/index.ts bffs/emprestimo/src/__tests__/app.test.ts bffs/emprestimo/README.md
git commit -m "feat(bff-emprestimo): montagem do app, bootstrap e README do serviço"
```

- [ ] **Step 10: Smoke test manual ponta a ponta (Gateway + BFF-emprestimo)**

Pré-requisito: o plano `2026-07-05-gateway-core.md` já foi executado (pacote `gateway/` existe).

Terminal 1: `cd bffs/emprestimo && npm run dev`
Terminal 2: `cd gateway && npm run dev`
Terminal 3:
```bash
curl -i http://localhost:4000/bff/emprestimo/contratos
```
Expected: `HTTP/1.1 200`, corpo é um array de contratos em camelCase (`numero`, `linhaDeCredito`, ...), header `X-Correlation-Id` presente.

Confirmar auditoria: `cat gateway/logs/audit.log` deve conter uma linha com `"targetBff":"emprestimo"` e `"path":"/bff/emprestimo/contratos"`.

Encerrar os dois servidores com `Ctrl+C`.

---

### Task 10: Estender `domain/index.ts` e reescrever `endpoints.ts` do MFE

**Files:**
- Modify: `mfes/emprestimo/src/domain/index.ts`
- Delete: `mfes/emprestimo/src/dto/index.ts`
- Delete: `mfes/emprestimo/src/mappers/index.ts`
- Delete: `mfes/emprestimo/src/mappers/__tests__/index.test.ts`
- Modify: `mfes/emprestimo/src/api/endpoints.ts`
- Modify: `mfes/emprestimo/src/api/__tests__/endpoints.test.ts`

**Interfaces:**
- Produces (novos tipos em `domain/index.ts`): `TermoConsentimento`, `DadosTrabalhador`, `DataVencimentoContratosAptos`, `SolicitacaoDeProposta`, `PropostaEnviada`, `SimulacaoRequest`, `AssinarTermoRequest` — idênticos, campo a campo, aos definidos em `bffs/emprestimo/src/domain.ts` (Task 3). São o contrato de wire entre o MFE e o BFF; os dois arquivos não se importam entre si (pacotes independentes).
- Produces (`endpoints.ts`): `EmprestimoApi` com a mesma superfície pública de hoje (mesmos nomes de método e mesma assinatura de parâmetros), mas apontando para as rotas novas do BFF e retornando tipos de `domain` em vez de `dto`.

- [ ] **Step 1: Adicionar os tipos novos em `mfes/emprestimo/src/domain/index.ts`**

Adicionar ao final do arquivo (mantendo tudo que já existe):

```typescript
export interface TermoConsentimento {
  versaoDoTermo?: number
  tipoDoTermo?: string
  textoDoTermo?: string
  variaveisDosTermos?: unknown
}

export interface DadosTrabalhador {
  possuiAutorizacaoParaConsulta?: boolean
  valorBaseMargem?: number
  valorMargemDisponivel?: number
}

export interface DataVencimentoContratosAptos {
  dataDeVencimentoInicial?: string
  contratosAptosAoRefinanciamento?: unknown[]
}

export interface SolicitacaoDeProposta {
  valorLiquido: number
  numeroParcelas: number
  linhaCredito: number
  mesAnoVencimento?: string
  dataLiberacao?: string
  tipoDeVencimento?: number
  diaVencimento?: number
  numeroDaContaCorrenteParaLiberacaoDoCredito?: number
  numeroDeContratosDeEmprestimoParaRefinanciamento?: string[]
  observacao?: string
  assinaturaDoTermoDeInclusaoDeProposta?: {
    tipoDoTermoDeAceite?: string
    sistemaDeOrigem?: string
    textoDoTermoDeAceite?: string
  }
}

export interface PropostaEnviada {
  numeroDoContrato: string
}

export interface SimulacaoRequest {
  linhaDeCredito: number
  dataDeLiberacao?: string
  valorLiquido: number
  valorDaCad?: number
  numeroDeParcelas: number[]
  taxaContratual?: number
  tipoDeVencimento?: number
  diaDeVencimento?: number
  mesAnoDeVencimento?: string
  numeroDosContratosHaRefinanciar?: string[]
}

export interface AssinarTermoRequest {
  tipoDoTermoDeAceite: string
  sistemaDeOrigem: string
}
```

- [ ] **Step 2: Apagar `dto/index.ts` e `mappers/`**

```bash
rm mfes/emprestimo/src/dto/index.ts
rmdir mfes/emprestimo/src/dto
rm mfes/emprestimo/src/mappers/index.ts
rm mfes/emprestimo/src/mappers/__tests__/index.test.ts
rmdir mfes/emprestimo/src/mappers/__tests__
rmdir mfes/emprestimo/src/mappers
```

- [ ] **Step 3: Reescrever `mfes/emprestimo/src/api/endpoints.ts`**

```typescript
import { createHttpClient } from './httpClient'
import type { MfeMountContext } from '../contract'
import type {
  Contrato, Proposta, Movimento, ParcelaPrevista, ParcelaDetalhe, ParcelaAtraso,
  LinhaDeCredito, EmprestimoSimulado, TermoConsentimento, DadosTrabalhador,
  DataVencimentoContratosAptos, SolicitacaoDeProposta, PropostaEnviada,
  SimulacaoRequest, AssinarTermoRequest,
} from '../domain'

export function createApi(ctx: MfeMountContext) {
  const client = createHttpClient(ctx)
  const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) })
  return {
    listarContratos: () => client<Contrato[]>('/contratos'),
    obterContrato: (id: string) => client<Contrato>(`/contratos/${id}`),
    listarPropostas: () => client<Proposta[]>('/propostas'),
    excluirProposta: (id: string) =>
      client<boolean>(`/propostas/${id}`, { method: 'DELETE' }),
    obterExtrato: (id: string, di: string, df: string) =>
      client<Movimento[]>(`/contratos/${id}/extrato?inicio=${di}&fim=${df}`),
    obterPrevisao: (id: string) =>
      client<ParcelaPrevista[]>(`/contratos/${id}/previsao`),
    obterDetalhamento: (id: string) =>
      client<ParcelaDetalhe[]>(`/contratos/${id}/parcelas`),
    obterAtraso: (id: string) =>
      client<ParcelaAtraso[]>(`/contratos/${id}/atraso`),
    obterParametrosSimulacao: () =>
      client<LinhaDeCredito[]>('/simulacao/parametros'),
    obterPrimeiroVencimento: (cl: number, tv: number, dv: number, dl: string, dr: string) =>
      client<DataVencimentoContratosAptos>(
        `/simulacao/primeiro-vencimento?cl=${cl}&tv=${tv}&dv=${dv}&dl=${dl}&dr=${dr}`),
    simularMultiplas: (body: SimulacaoRequest) =>
      client<EmprestimoSimulado[]>('/simulacao/multiplas', post(body)),
    obterTermo: (tipo: 'PropostaWeb' | 'AutorizacaoConsultaDadosDoTrabalhador' | 'CONSENTIMENTO_DADOS_CADASTRAIS') =>
      client<TermoConsentimento>(`/termos/${tipo}`),
    preencherVariaveis: (body: TermoConsentimento) =>
      client<string>('/termos/preencher-variaveis', post(body)),
    assinarTermo: (body: AssinarTermoRequest) =>
      client<boolean>('/termos/assinar', post(body)),
    obterDadosTrabalhador: () =>
      client<DadosTrabalhador>('/dados-trabalhador'),
    enviarProposta: (body: SolicitacaoDeProposta) =>
      client<PropostaEnviada>('/propostas', post(body)),
  }
}

export type EmprestimoApi = ReturnType<typeof createApi>
```

- [ ] **Step 4: Reescrever `mfes/emprestimo/src/api/__tests__/endpoints.test.ts`**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createApi } from '../endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

function jsonFetch(data: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(data)))
}

describe('endpoints', () => {
  it('listarContratos faz GET em /contratos', async () => {
    const fetchMock = jsonFetch([{ numero: '1' }])
    vi.stubGlobal('fetch', fetchMock)
    const api = createApi(ctx)
    const res = await api.listarContratos()
    expect(fetchMock).toHaveBeenCalledWith('http://api/contratos', expect.any(Object))
    expect(res[0].numero).toBe('1')
  })

  it('simularMultiplas faz POST com body em /simulacao/multiplas', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.simularMultiplas({ linhaDeCredito: 205, valorLiquido: 10000, numeroDeParcelas: [24] })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://api/simulacao/multiplas',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('obterContrato faz GET em /contratos/:id', async () => {
    vi.stubGlobal('fetch', jsonFetch({ numero: '001-A' }))
    const api = createApi(ctx)
    await api.obterContrato('001-A')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/contratos/001-A'), expect.any(Object))
  })

  it('listarPropostas faz GET em /propostas', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.listarPropostas()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/propostas'), expect.any(Object))
  })

  it('excluirProposta faz DELETE em /propostas/:id', async () => {
    vi.stubGlobal('fetch', jsonFetch(true))
    const api = createApi(ctx)
    await api.excluirProposta('PRP-99')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/propostas/PRP-99'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('obterExtrato faz GET com datas na querystring', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.obterExtrato('001-A', '2026-05-01', '2026-06-01')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/contratos/001-A/extrato?inicio=2026-05-01&fim=2026-06-01'),
      expect.any(Object),
    )
  })

  it('obterParametrosSimulacao faz GET em /simulacao/parametros', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.obterParametrosSimulacao()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/simulacao/parametros'), expect.any(Object))
  })

  it('enviarProposta faz POST em /propostas', async () => {
    vi.stubGlobal('fetch', jsonFetch({ numeroDoContrato: 'CTR-100' }))
    const api = createApi(ctx)
    const result = await api.enviarProposta({ valorLiquido: 10000, numeroParcelas: 24, linhaCredito: 205 })
    expect(result.numeroDoContrato).toBe('CTR-100')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('http://api/propostas', expect.objectContaining({ method: 'POST' }))
  })

  it('assinarTermo faz POST em /termos/assinar', async () => {
    vi.stubGlobal('fetch', jsonFetch(true))
    const api = createApi(ctx)
    await api.assinarTermo({ tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB' })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/termos/assinar'), expect.objectContaining({ method: 'POST' }))
  })
})
```

- [ ] **Step 5: Rodar os testes deste pacote e confirmar que passam**

Run: `cd mfes/emprestimo && npx vitest run src/api/__tests__/endpoints.test.ts`
Expected: PASS (9 testes). (As demais suítes do MFE ainda falham nesta etapa — telas e mappers deletados são corrigidos na Task 11.)

- [ ] **Step 6: Commit**

```bash
git add mfes/emprestimo/src/domain/index.ts mfes/emprestimo/src/api/endpoints.ts mfes/emprestimo/src/api/__tests__/endpoints.test.ts
git rm mfes/emprestimo/src/dto/index.ts mfes/emprestimo/src/mappers/index.ts mfes/emprestimo/src/mappers/__tests__/index.test.ts
git commit -m "refactor(emprestimo): consumir o contrato limpo do BFF, remover dto/mappers"
```

---

### Task 11: Atualizar as telas que consumiam `mappers`

**Files:**
- Modify: `mfes/emprestimo/src/screens/ContratosPropostas.tsx`
- Modify: `mfes/emprestimo/src/screens/consultas.tsx`
- Modify: `mfes/emprestimo/src/screens/Contrato.tsx`
- Modify: `mfes/emprestimo/src/screens/Simulador.tsx`
- Modify: `mfes/emprestimo/src/screens/ResultadoEnvio.tsx`
- Modify: `mfes/emprestimo/src/screens/__tests__/ContratosPropostas.test.tsx`
- Modify: `mfes/emprestimo/src/screens/__tests__/consultas.test.tsx`
- Modify: `mfes/emprestimo/src/screens/__tests__/Contrato.test.tsx`
- Modify: `mfes/emprestimo/src/screens/__tests__/Simulador.test.tsx`
- Modify: `mfes/emprestimo/src/screens/__tests__/ResultadoEnvio.test.tsx`
- Modify: `mfes/emprestimo/src/__tests__/contract.test.tsx`
- Modify: `mfes/emprestimo/src/__tests__/EmprestimoApp.test.tsx`

**Interfaces:**
- Consumes: `EmprestimoApi` (Task 10) e os tipos de `domain/index.ts` (Task 10).
- Produces: nenhuma interface nova — só remove a chamada a `mappers` de cada tela, já que a API agora devolve o formato limpo diretamente.

- [ ] **Step 1: Atualizar `mfes/emprestimo/src/screens/ContratosPropostas.tsx`**

Remover o import de `mappers` e o `.map(toContrato)`/`.map(toProposta)`:

```typescript
import { useState } from 'react'
import type { EmprestimoApi } from '../api/endpoints'
import type { View } from '../domain'
import { useAsync } from '../hooks/useAsync'
import { HeaderMarca, CardBase, ChipStatus, ActionButton, Metric, EmptyState } from '../components/ui'

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export function ContratosPropostas({ api, ir }: { api: EmprestimoApi; ir: (v: View) => void }) {
  const [aba, setAba] = useState<'contratos' | 'propostas'>('contratos')
  const contratos = useAsync(() => api.listarContratos(), [])
  const propostas = useAsync(() => api.listarPropostas(), [])
  const listaContratos = contratos.data ?? []
  const listaPropostas = propostas.data ?? []
  const saldoTotal = listaContratos.reduce((total, contrato) => total + contrato.saldoAtual, 0)
  const contratosEmAtraso = listaContratos.filter((contrato) => contrato.temAtraso).length

  return (
    <section className="emprestimo-screen">
      <HeaderMarca
        titulo="Empréstimos"
        subtitulo="Acompanhe contratos ativos, propostas e simule novas operações."
        acao={<ActionButton className="emprestimo-action-button--compact" onClick={() => ir({ tela: 'emprestimo-simulador' })}>Simular novo empréstimo</ActionButton>}
      />

      <div className="emprestimo-metrics-grid" aria-label="Resumo da carteira">
        <Metric rotulo="Saldo em aberto" valor={contratos.loading ? 'Carregando' : moeda(saldoTotal)} />
        <Metric rotulo="Contratos ativos" valor={contratos.loading ? '—' : listaContratos.length} detalhe={`${contratosEmAtraso} em atraso`} />
        <Metric rotulo="Propostas" valor={propostas.loading ? '—' : listaPropostas.length} detalhe="em acompanhamento" />
      </div>

      <nav className="emprestimo-abas" role="tablist">
        <button role="tab" aria-selected={aba === 'contratos'} onClick={() => setAba('contratos')}>Contratos</button>
        <button role="tab" aria-selected={aba === 'propostas'} onClick={() => setAba('propostas')}>Propostas</button>
      </nav>

      {aba === 'contratos' && (
        contratos.loading ? <p className="emprestimo-feedback">Carregando contratos...</p>
        : contratos.error ? <p role="alert">Não foi possível carregar os contratos.</p>
        : listaContratos.length === 0 ? <EmptyState titulo="Nenhum contrato ativo" descricao="Quando houver contratos, eles aparecerão nesta carteira." />
        : (
          <div className="emprestimo-record-list">
            {listaContratos.map((c) => (
              <CardBase key={c.numero} className="emprestimo-record">
                <button className="emprestimo-card__link emprestimo-record__main" onClick={() => ir({ tela: 'emprestimo-contrato', contrato: c.numero })}>
                  <span className="emprestimo-record__eyebrow">Contrato</span>
                  <strong><span>{c.numero}</span><span> — {c.linhaDeCredito}</span></strong>
                  <span>{c.parcelasRestantes} de {c.parcelas} parcelas restantes</span>
                </button>
                <div className="emprestimo-record__metrics">
                  <Metric rotulo="Saldo atual" valor={moeda(c.saldoAtual)} />
                  <Metric rotulo="Taxa" valor={`${percentual(c.taxaDeJuros)} a.m.`} />
                  <Metric rotulo="Próxima parcela" valor={c.proximaParcela ? moeda(c.proximaParcela.valor) : '—'} detalhe={c.proximaParcela?.vencimento} />
                </div>
                <div className="emprestimo-record__status">
                  <ChipStatus texto={c.temAtraso ? 'Em atraso' : 'Em dia'} tom={c.temAtraso ? 'erro' : 'ok'} />
                </div>
              </CardBase>
            ))}
          </div>
        )
      )}

      {aba === 'propostas' && (
        propostas.loading ? <p className="emprestimo-feedback">Carregando propostas...</p>
        : propostas.error ? <p role="alert">Não foi possível carregar as propostas.</p>
        : listaPropostas.length === 0 ? <EmptyState titulo="Nenhuma proposta em aberto" descricao="Novas simulações enviadas aparecerão aqui para acompanhamento." />
        : (
          <div className="emprestimo-record-list">
            {listaPropostas.map((p) => (
              <CardBase key={p.numero} className="emprestimo-record">
                <div className="emprestimo-record__main">
                  <span className="emprestimo-record__eyebrow">Proposta</span>
                  <strong>{p.numero} — {p.linhaDeCredito}</strong>
                  <span>Emitida em {p.dataDeEmissao}</span>
                </div>
                <div className="emprestimo-record__metrics">
                  <Metric rotulo="Valor líquido" valor={moeda(p.valorLiquido)} />
                  <Metric rotulo="Valor bruto" valor={moeda(p.valorBruto)} />
                  <Metric rotulo="Condição" valor={`${p.parcelas}x`} detalhe={`${percentual(p.taxaDeJuros)} a.m.`} />
                </div>
                <div className="emprestimo-record__status">
                  <ChipStatus texto={p.status} tom="aviso" />
                </div>
              </CardBase>
            ))}
          </div>
        )
      )}
    </section>
  )
}
```

- [ ] **Step 2: Atualizar `mfes/emprestimo/src/screens/consultas.tsx`**

```typescript
import type { EmprestimoApi } from '../api/endpoints'
import type { View, Movimento, ParcelaPrevista, ParcelaDetalhe, ParcelaAtraso } from '../domain'
import { ConsultaTabela, type Coluna } from '../components/ConsultaTabela'

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ConsultaScreen(
  { api, view, voltar }:
  { api: EmprestimoApi; view: Extract<View, { tela: 'emprestimo-extrato' | 'emprestimo-previsao' | 'emprestimo-detalhamento' | 'emprestimo-atraso' }>; voltar: () => void },
) {
  const id = view.contrato
  switch (view.tela) {
    case 'emprestimo-extrato': {
      const colunas: Coluna<Movimento>[] = [
        { cabecalho: 'Data', valor: (m) => m.data },
        { cabecalho: 'Histórico', valor: (m) => m.historico },
        { cabecalho: 'Tipo', valor: (m) => m.tipo },
        { cabecalho: 'Valor', valor: (m) => moeda(m.valor) },
        { cabecalho: 'Saldo', valor: (m) => moeda(m.saldo) },
      ]
      return <ConsultaTabela titulo="Extrato" colunas={colunas} voltar={voltar}
        carregar={async () => api.obterExtrato(id, '2026-05-30', '2026-06-29')} />
    }
    case 'emprestimo-previsao': {
      const colunas: Coluna<ParcelaPrevista>[] = [
        { cabecalho: 'Parcela', valor: (p) => String(p.numero) },
        { cabecalho: 'Vencimento', valor: (p) => p.vencimento },
        { cabecalho: 'Prestação', valor: (p) => moeda(p.prestacao) },
        { cabecalho: 'Saldo', valor: (p) => moeda(p.saldoAtual) },
      ]
      return <ConsultaTabela titulo="Previsão de parcelas" colunas={colunas} voltar={voltar}
        carregar={async () => api.obterPrevisao(id)} />
    }
    case 'emprestimo-detalhamento': {
      const colunas: Coluna<ParcelaDetalhe>[] = [
        { cabecalho: 'Parcela', valor: (p) => String(p.numero) },
        { cabecalho: 'Vencimento', valor: (p) => p.vencimento },
        { cabecalho: 'Prestação', valor: (p) => moeda(p.prestacao) },
        { cabecalho: 'Status', valor: (p) => p.status },
      ]
      return <ConsultaTabela titulo="Detalhamento" colunas={colunas} voltar={voltar}
        carregar={async () => api.obterDetalhamento(id)} />
    }
    case 'emprestimo-atraso': {
      const colunas: Coluna<ParcelaAtraso>[] = [
        { cabecalho: 'Vencimento', valor: (p) => p.vencimento },
        { cabecalho: 'Prestação', valor: (p) => moeda(p.valorPrestacao) },
        { cabecalho: 'Saldo', valor: (p) => moeda(p.saldoAtual) },
        { cabecalho: 'Próx. vencimento', valor: (p) => p.proximoVencimento },
      ]
      return <ConsultaTabela titulo="Parcelas em atraso" colunas={colunas} voltar={voltar}
        carregar={async () => api.obterAtraso(id)} />
    }
    default: {
      const _exhaustive: never = view
      return _exhaustive
    }
  }
}
```

- [ ] **Step 3: Atualizar `mfes/emprestimo/src/screens/Contrato.tsx`**

```typescript
import type { EmprestimoApi } from '../api/endpoints'
import type { View } from '../domain'
import { useAsync } from '../hooks/useAsync'
import { HeaderMarca, CardBase, ActionButton, ChipStatus, Metric } from '../components/ui'

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export function Contrato(
  { api, contrato, ir, voltar }:
  { api: EmprestimoApi; contrato: string; ir: (v: View) => void; voltar: () => void },
) {
  const { data, loading, error } = useAsync(() => api.obterContrato(contrato), [contrato])
  if (loading) return (<section className="emprestimo-screen"><HeaderMarca titulo="Contrato" onVoltar={voltar} /><p className="emprestimo-feedback">Carregando contrato...</p></section>)
  if (error || !data) return (<section className="emprestimo-screen"><HeaderMarca titulo="Contrato" onVoltar={voltar} /><p role="alert">Falha ao carregar o contrato.</p></section>)
  const c = data
  return (
    <section className="emprestimo-screen">
      <HeaderMarca titulo={`Contrato ${c.numero}`} subtitulo={c.linhaDeCredito} onVoltar={voltar} />
      <CardBase className="emprestimo-detail-card">
        <div className="emprestimo-detail-card__topline">
          <span>Operação em andamento</span>
          <ChipStatus texto={c.temAtraso ? 'Em atraso' : 'Em dia'} tom={c.temAtraso ? 'erro' : 'ok'} />
        </div>
        <div className="emprestimo-metrics-grid emprestimo-metrics-grid--detail">
          <Metric rotulo="Saldo atual" valor={moeda(c.saldoAtual)} detalhe={`Liberado: ${moeda(c.valorLiberado)}`} />
          <Metric rotulo="Parcelas restantes" valor={`${c.parcelasRestantes}/${c.parcelas}`} />
          <Metric rotulo="Taxa contratual" valor={`${percentual(c.taxaDeJuros)} a.m.`} />
          <Metric rotulo="CET" valor={`${percentual(c.cetMensal)} a.m.`} detalhe={`${percentual(c.cetAnual)} a.a.`} />
        </div>
        {c.proximaParcela && (
          <div className="emprestimo-next-installment">
            <span>Próxima parcela</span>
            <strong>{moeda(c.proximaParcela.valor)}</strong>
            <span>Vencimento {c.proximaParcela.vencimento}</span>
          </div>
        )}
      </CardBase>
      <div className="emprestimo-acoes">
        <ActionButton onClick={() => ir({ tela: 'emprestimo-extrato', contrato })}>Ver extrato</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-previsao', contrato })}>Ver previsão de parcelas</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-detalhamento', contrato })}>Ver detalhamento</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-atraso', contrato })} variante="secundario">Parcelas em atraso</ActionButton>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Atualizar `mfes/emprestimo/src/screens/Simulador.tsx`**

```typescript
import { useForm } from 'react-hook-form'
import type { EmprestimoApi } from '../api/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useSimulador } from '../hooks/useSimulador'
import { HeaderMarca, CardBase, ActionButton, Metric, EmptyState } from '../components/ui'
import { ResultadoEnvio } from './ResultadoEnvio'

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export function Simulador(
  { api, tipo, voltar }:
  { api: EmprestimoApi; tipo?: 'refinanciar'; voltar: () => void },
) {
  const params = useAsync(() => api.obterParametrosSimulacao(), [])
  const sim = useSimulador()
  const { register, handleSubmit } = useForm<{ valorLiquido: number; parcelas: number }>()

  if (sim.estado.passo === 'parametros') {
    const linhas = params.data ?? []
    return (
      <section className="emprestimo-screen">
        <HeaderMarca titulo="Simular empréstimo" subtitulo="Escolha a linha de crédito para iniciar uma nova proposta." onVoltar={voltar} />
        {params.loading ? <p className="emprestimo-feedback">Carregando parâmetros...</p>
          : params.error ? <p role="alert">Falha ao carregar parâmetros.</p>
          : linhas.length === 0 ? <EmptyState titulo="Nenhuma linha disponível" descricao="Não há linhas habilitadas para simulação neste momento." />
          : (
            <div className="emprestimo-product-grid">
              {linhas.map((l) => (
                <button key={l.id} className="emprestimo-product-card" onClick={() => sim.escolherLinha(l)}>
                  <span className="emprestimo-record__eyebrow">Linha {l.id}</span>
                  <strong>{l.descricao}</strong>
                  <span>{l.numeroMinimoDeParcelas} a {l.numeroMaximoDeParcelas} parcelas</span>
                  <div className="emprestimo-product-card__metrics">
                    <Metric rotulo="Taxa" valor={`${percentual(l.percentualTaxaJuros)} a.m.`} />
                    <Metric rotulo="Valor" valor={`${moeda(l.valorMinimo)} a ${moeda(l.valorMaximo)}`} />
                  </div>
                  <span className="emprestimo-product-card__cta">Selecionar linha</span>
                </button>
              ))}
            </div>
          )}
      </section>
    )
  }

  if (sim.estado.passo === 'valores') {
    const linha = sim.estado.linha!
    return (
      <section className="emprestimo-screen">
        <HeaderMarca titulo={linha.descricao} subtitulo="Informe a condição desejada para calcular a proposta." onVoltar={() => sim.irPara('parametros')} />
        <CardBase className="emprestimo-form-card">
          <div className="emprestimo-form-card__aside">
            <Metric rotulo="Taxa da linha" valor={`${percentual(linha.percentualTaxaJuros)} a.m.`} />
            <Metric rotulo="Faixa permitida" valor={`${moeda(linha.valorMinimo)} a ${moeda(linha.valorMaximo)}`} />
            <Metric rotulo="Parcelamento" valor={`${linha.numeroMinimoDeParcelas} a ${linha.numeroMaximoDeParcelas}x`} />
          </div>
          <form className="emprestimo-form" onSubmit={handleSubmit((v) => sim.definirValores(Number(v.valorLiquido), Number(v.parcelas)))}>
            <label>
              Valor líquido
              <input
                type="number"
                min={linha.valorMinimo}
                max={linha.valorMaximo}
                placeholder="Ex.: 5000"
                {...register('valorLiquido', { required: true })}
              />
            </label>
            <label>
              Parcelas
              <input
                type="number"
                min={linha.numeroMinimoDeParcelas}
                max={linha.numeroMaximoDeParcelas}
                placeholder={`${linha.numeroMinimoDeParcelas} a ${linha.numeroMaximoDeParcelas}`}
                {...register('parcelas', { required: true })}
              />
            </label>
            <ActionButton type="submit">Calcular simulação</ActionButton>
          </form>
        </CardBase>
      </section>
    )
  }

  // passos 'resultado' / 'termo' / 'enviado': Task 14
  return <ResultadoEnvio api={api} sim={sim} tipo={tipo} voltar={voltar} />
}
```

- [ ] **Step 5: Atualizar `mfes/emprestimo/src/screens/ResultadoEnvio.tsx`**

```typescript
import { useState } from 'react'
import type { EmprestimoApi } from '../api/endpoints'
import type { useSimulador } from '../hooks/useSimulador'
import { useAsync } from '../hooks/useAsync'
import { HeaderMarca, CardBase, ActionButton, Metric } from '../components/ui'

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ResultadoEnvio(
  { api, sim, voltar }:
  { api: EmprestimoApi; sim: ReturnType<typeof useSimulador>; tipo?: 'refinanciar'; voltar: () => void },
) {
  const { estado, irPara } = sim
  const [numeroContrato, setNumeroContrato] = useState<string | null>(null)

  const simulacao = useAsync(async () => {
    const cenarios = await api.simularMultiplas({
      linhaDeCredito: estado.linha!.id, dataDeLiberacao: '2026-06-30',
      valorLiquido: estado.valorLiquido, valorDaCad: -1, numeroDeParcelas: [estado.parcelas],
      taxaContratual: -1, tipoDeVencimento: 2, diaDeVencimento: 5, mesAnoDeVencimento: '08/2026',
      numeroDosContratosHaRefinanciar: [],
    })
    return cenarios
  }, [estado.linha?.id, estado.valorLiquido, estado.parcelas])

  if (estado.passo === 'resultado') {
    const cenario = simulacao.data?.[0]
    return (
      <section className="emprestimo-screen">
        <HeaderMarca titulo="Resultado da simulação" subtitulo="Confira os valores antes de seguir para o termo." onVoltar={() => irPara('valores')} />
        {simulacao.loading ? <p className="emprestimo-feedback">Simulando...</p>
          : simulacao.error || !cenario ? <p role="alert">Falha na simulação.</p>
          : (
            <CardBase className="emprestimo-detail-card">
              <div className="emprestimo-metrics-grid emprestimo-metrics-grid--detail">
                <Metric rotulo="Valor líquido" valor={moeda(cenario.valorLiquido)} />
                <Metric rotulo="Valor bruto" valor={moeda(cenario.valorBruto)} />
                <Metric rotulo="Parcelas" valor={`${cenario.parcelas}x`} detalhe={`Total: ${moeda(cenario.totalDasParcelas)}`} />
                <Metric rotulo="CET" valor={`${cenario.cet}% a.m.`} detalhe={`${cenario.cetAnual}% a.a.`} />
              </div>
              <ActionButton onClick={() => irPara('termo')}>Continuar para o termo</ActionButton>
            </CardBase>
          )}
      </section>
    )
  }

  if (estado.passo === 'termo') {
    return <PassoTermo api={api} linhaTrabalhador={estado.linha!.creditoTrabalhador}
      onAssinado={async () => {
        const r = await api.enviarProposta({
          valorLiquido: estado.valorLiquido, numeroParcelas: estado.parcelas, linhaCredito: estado.linha!.id,
          mesAnoVencimento: '08/2026', dataLiberacao: '2026-06-30', tipoDeVencimento: 2,
          diaVencimento: 5, numeroDaContaCorrenteParaLiberacaoDoCredito: 1001,
          numeroDeContratosDeEmprestimoParaRefinanciamento: [],
          assinaturaDoTermoDeInclusaoDeProposta: { tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB', textoDoTermoDeAceite: 'aceito' },
        })
        setNumeroContrato(r.numeroDoContrato)
        irPara('enviado')
      }}
      voltar={() => irPara('resultado')} />
  }

  return (
    <section className="emprestimo-screen">
      <HeaderMarca titulo="Proposta enviada" subtitulo="A operação foi registrada para acompanhamento." onVoltar={voltar} />
      <CardBase className="emprestimo-success-card">
        <span>Contrato gerado</span>
        <strong role="status">{numeroContrato ?? 'Aguardando confirmação'}</strong>
        <p>Proposta registrada{numeroContrato ? ` sob o contrato ${numeroContrato}` : ''}. Use a aba de propostas para acompanhar a análise e os próximos passos.</p>
      </CardBase>
    </section>
  )
}

function PassoTermo(
  { api, linhaTrabalhador, onAssinado, voltar }:
  { api: EmprestimoApi; linhaTrabalhador: boolean; onAssinado: () => Promise<void>; voltar: () => void },
) {
  const termo = useAsync(() => api.obterTermo('PropostaWeb'), [])
  const dados = useAsync(() => linhaTrabalhador ? api.obterDadosTrabalhador()
    : Promise.resolve(null), [linhaTrabalhador])
  return (
    <section className="emprestimo-screen">
      <HeaderMarca titulo="Termo de aceite" subtitulo="Leia as condições antes de enviar a proposta." onVoltar={voltar} />
      {termo.loading ? <p className="emprestimo-feedback">Carregando termo...</p>
        : <CardBase className="emprestimo-term-card"><p>{termo.data?.textoDoTermo}</p></CardBase>}
      {linhaTrabalhador && dados.data && (
        <CardBase className="emprestimo-inline-panel">
          <Metric rotulo="Margem disponível DataPrev" valor={dados.data.valorMargemDisponivel?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—'} />
        </CardBase>
      )}
      <ActionButton onClick={async () => {
        await api.preencherVariaveis(termo.data!)
        await api.assinarTermo({ tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB' })
        await onAssinado()
      }}>Assinar e enviar proposta</ActionButton>
    </section>
  )
}
```

- [ ] **Step 6: Atualizar `mfes/emprestimo/src/screens/__tests__/ContratosPropostas.test.tsx`**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContratosPropostas } from '../ContratosPropostas'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

function stubFetch(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const key = Object.keys(map).find((k) => url.includes(k))
    return new Response(JSON.stringify(key ? map[key] : []))
  }))
}

describe('ContratosPropostas', () => {
  it('mostra o header de imediato e lista contratos após carregar', async () => {
    stubFetch({ '/contratos': [{ numero: '123456-7', linhaDeCredito: 'Crédito Pessoal',
      valorLiberado: 15000, saldoAtual: 9245.5, parcelas: 24, parcelasRestantes: 14,
      taxaDeJuros: 1.89, cetMensal: 0, cetAnual: 0, temAtraso: false, proximaParcela: null }] })
    const ir = vi.fn()
    render(<ContratosPropostas api={createApi(ctx)} ir={ir} />)
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('123456-7')).toBeInTheDocument())
  })

  it('clicar num contrato navega para o detalhe', async () => {
    stubFetch({ '/contratos': [{ numero: '123456-7', linhaDeCredito: 'Crédito Pessoal',
      valorLiberado: 15000, saldoAtual: 9245.5, parcelas: 24, parcelasRestantes: 14,
      taxaDeJuros: 1.89, cetMensal: 0, cetAnual: 0, temAtraso: false, proximaParcela: null }] })
    const ir = vi.fn()
    render(<ContratosPropostas api={createApi(ctx)} ir={ir} />)
    await userEvent.click(await screen.findByText('123456-7'))
    expect(ir).toHaveBeenCalledWith({ tela: 'emprestimo-contrato', contrato: '123456-7' })
  })

  it('mostra alerta de erro na aba Propostas quando o fetch falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/propostas')) return new Response('{}', { status: 500 })
      return new Response(JSON.stringify([]))
    }))
    render(<ContratosPropostas api={createApi(ctx)} ir={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /Propostas/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Não foi possível carregar as propostas/i))
  })
})
```

- [ ] **Step 7: Atualizar `mfes/emprestimo/src/screens/__tests__/consultas.test.tsx`**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ConsultaScreen } from '../consultas'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

describe('ConsultaScreen', () => {
  it('extrato: renderiza os movimentos numa tabela', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ tipo: 'Debito', data: '2026-06-10', historico: 'Prestação mensal', valor: 944.3, saldo: 10189.8 }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-extrato', contrato: '123456-7' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('Prestação mensal')).toBeInTheDocument())
  })

  it('atraso: lista parcelas em atraso', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ contrato: '654321-0', vencimento: '2026-05-05', valorPrestacao: 615.8, saldoAtual: 4320.12, proximoVencimento: '2026-07-05' }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-atraso', contrato: '654321-0' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('2026-05-05')).toBeInTheDocument())
  })

  it('previsao: lista parcelas previstas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ numero: 1, vencimento: '2026-07-05', prestacao: 455.5, saldoAtual: 9000 }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-previsao', contrato: '001-A' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('2026-07-05')).toBeInTheDocument())
  })

  it('detalhamento: lista parcelas detalhadas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ numero: 1, vencimento: '2026-07-05', prestacao: 455.5, status: 'Paga' }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-detalhamento', contrato: '001-A' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('Paga')).toBeInTheDocument())
  })
})
```

- [ ] **Step 8: Atualizar `mfes/emprestimo/src/screens/__tests__/Contrato.test.tsx`**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Contrato } from '../Contrato'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

describe('Contrato', () => {
  it('carrega o contrato e navega para o extrato', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      numero: '123456-7', linhaDeCredito: 'Crédito Pessoal', valorLiberado: 15000, saldoAtual: 9245.5,
      parcelas: 24, parcelasRestantes: 14, taxaDeJuros: 1.89, cetMensal: 2.11, cetAnual: 28.7,
      temAtraso: false, proximaParcela: null,
    }))))
    const ir = vi.fn()
    render(<Contrato api={createApi(ctx)} contrato="123456-7" ir={ir} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Crédito Pessoal/)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Ver extrato/i }))
    expect(ir).toHaveBeenCalledWith({ tela: 'emprestimo-extrato', contrato: '123456-7' })
  })
})
```

- [ ] **Step 9: Atualizar `mfes/emprestimo/src/screens/__tests__/Simulador.test.tsx`**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Simulador } from '../Simulador'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

const linhas = [{ id: 205, descricao: 'Refinanciamento Consignado', numeroMinimoDeParcelas: 12,
  numeroMaximoDeParcelas: 48, valorMinimo: 3000, valorMaximo: 50000, percentualTaxaJuros: 1.39, creditoTrabalhador: true }]

describe('Simulador (parâmetros + valores)', () => {
  it('carrega parâmetros e mostra as linhas de crédito disponíveis', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(linhas))))
    render(<Simulador api={createApi(ctx)} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Refinanciamento Consignado/)).toBeInTheDocument())
  })

  it('avança de parâmetros para valores ao escolher uma linha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(linhas))))
    render(<Simulador api={createApi(ctx)} voltar={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /Refinanciamento Consignado/ }))
    expect(screen.getByLabelText(/Valor líquido/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Atualizar `mfes/emprestimo/src/screens/__tests__/ResultadoEnvio.test.tsx`**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultadoEnvio } from '../ResultadoEnvio'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

const linha = {
  id: 205, descricao: 'Refin', creditoTrabalhador: false,
  numeroMinimoDeParcelas: 12, numeroMaximoDeParcelas: 48, valorMinimo: 3000, valorMaximo: 50000,
  percentualTaxaJuros: 1.39,
}

function makeSim(passo: 'resultado' | 'termo' | 'enviado') {
  return {
    estado: { passo, linha, valorLiquido: 10000, parcelas: 24 },
    escolherLinha: vi.fn(), definirValores: vi.fn(), irPara: vi.fn(),
  }
}

function stub(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const k = Object.keys(map).find((key) => url.includes(key))
    return new Response(JSON.stringify(k ? map[k] : {}))
  }))
}

describe('ResultadoEnvio', () => {
  it('simula e mostra a CET do cenário', async () => {
    stub({ 'simulacao/multiplas': [{ parcelas: 24, valorLiquido: 10000, valorBruto: 11250, cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480 }] })
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('resultado')} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/1\.74/)).toBeInTheDocument())
  })

  it('exibe erro quando simulação falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('resultado')} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Falha na simulação/i))
  })

  it('mostra estado de carregando durante a simulação', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('resultado')} voltar={() => {}} />)
    expect(screen.getByText(/Simulando/i)).toBeInTheDocument()
  })

  it('passo resultado: botão Continuar chama irPara(termo)', async () => {
    stub({ 'simulacao/multiplas': [{ parcelas: 24, valorLiquido: 10000, valorBruto: 11250, cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480 }] })
    const sim = makeSim('resultado')
    render(<ResultadoEnvio api={createApi(ctx)} sim={sim} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Continuar para o termo/i)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/Continuar para o termo/i))
    expect(sim.irPara).toHaveBeenCalledWith('termo')
  })

  it('passo termo: mostra texto do termo e botão assinar', async () => {
    stub({
      'termos/PropostaWeb': { textoDoTermo: 'Ao aceitar você concorda com os termos.' },
      'termos/assinar': true,
      'termos/preencher-variaveis': 'ok',
      propostas: { numeroDoContrato: 'CTR-999' },
    })
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('termo')} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Ao aceitar você concorda com os termos/i)).toBeInTheDocument())
    expect(screen.getByText(/Assinar e enviar proposta/i)).toBeInTheDocument()
  })

  it('passo enviado: mostra confirmação de envio', () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('enviado')} voltar={() => {}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/Proposta registrada/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 11: Atualizar `mfes/emprestimo/src/__tests__/contract.test.tsx`**

Sem mudança de payload (o teste só verifica mount/unmount com uma lista vazia) — apenas confirmar que continua passando com o novo `endpoints.ts`. Nenhuma edição de conteúdo é necessária além de reexecutar; se o arquivo já está exatamente assim, mantenha-o:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, unmount } from '../index'

afterEach(() => vi.restoreAllMocks())
const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }

describe('contrato mount/unmount', () => {
  it('mount injeta tema e renderiza a jornada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([]))))
    const el = document.createElement('div')
    mount(el, ctx)
    expect(el.querySelector('style[data-emprestimo-theme]')).not.toBeNull()
    await vi.waitFor(() => expect(el.textContent).toMatch(/Empréstimos/i))
    expect(el.querySelector('style[data-emprestimo-theme]')).not.toBeNull()
  })

  it('unmount remove tema e esvazia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([]))))
    const el = document.createElement('div')
    mount(el, ctx)
    await vi.waitFor(() => expect(el.childElementCount).toBeGreaterThan(0))
    unmount(el)
    expect(el.querySelector('style[data-emprestimo-theme]')).toBeNull()
    expect(el.childElementCount).toBe(0)
  })
})
```

- [ ] **Step 12: Atualizar `mfes/emprestimo/src/__tests__/EmprestimoApp.test.tsx`**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmprestimoApp } from '../EmprestimoApp'

afterEach(() => vi.restoreAllMocks())
const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }

const contrato = {
  numero: '001-A', linhaDeCredito: 'Pessoal', valorLiberado: 5000, saldoAtual: 3200,
  parcelas: 24, parcelasRestantes: 14, taxaDeJuros: 1.5, cetMensal: 1.6, cetAnual: 21,
  temAtraso: false, proximaParcela: null,
}

function stubFetch(handler: (url: string) => unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    new Response(JSON.stringify(handler(url)))
  ))
}

describe('EmprestimoApp', () => {
  it('renderiza conteúdo síncrono já no primeiro render (resiliência ao perf)', () => {
    render(<EmprestimoApp ctx={ctx} />)
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela Contrato ao clicar num contrato e volta', async () => {
    stubFetch((url) => {
      if (url.includes('contratos/001-A')) return contrato
      if (url.includes('/contratos')) return [contrato]
      if (url.includes('/propostas')) return []
      return []
    })
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByText(/001-A/)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/001-A/))
    await waitFor(() => expect(screen.getByText(/Pessoal/)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Voltar/i }))
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela Simulador ao clicar em Simular novo empréstimo e volta', async () => {
    stubFetch((url) => {
      if (url.includes('/simulacao/parametros')) return []
      return []
    })
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByText(/Simular novo empréstimo/i)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/Simular novo empréstimo/i))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Simular empréstimo/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Voltar/i }))
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela ConsultaScreen (extrato) a partir do Contrato', async () => {
    stubFetch((url) => {
      if (url.includes('contratos/001-A')) return contrato
      if (url.includes('/contratos')) return [contrato]
      if (url.includes('/propostas')) return []
      if (url.includes('/extrato')) return []
      return []
    })
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByText(/001-A/)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/001-A/))
    await waitFor(() => expect(screen.getByText(/Ver extrato/i)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/Ver extrato/i))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Extrato/i })).toBeInTheDocument())
  })
})
```

- [ ] **Step 13: Rodar toda a suíte do MFE e confirmar que passa**

Run: `cd mfes/emprestimo && npx vitest run`
Expected: todos os testes PASS.

- [ ] **Step 14: Commit**

```bash
git add mfes/emprestimo/src/screens mfes/emprestimo/src/__tests__
git commit -m "refactor(emprestimo): telas param de fazer o mapeamento PascalCase→camelCase, que agora é responsabilidade do BFF"
```

---

### Task 12: Cobertura final do MFE de empréstimo

**Files:**
- (nenhum arquivo novo — apenas verificação)

**Interfaces:**
- Consumes: toda a suíte de `mfes/emprestimo`.
- Produces: confirmação de que a migração não reduziu a cobertura abaixo do threshold já em vigor.

- [ ] **Step 1: Rodar a suíte completa com cobertura**

Run: `cd mfes/emprestimo && npm run test:coverage`
Expected: todos os testes PASS; cobertura ≥80% em lines/functions/branches/statements (mesmo threshold já configurado em `mfes/emprestimo/vitest.config.ts`).

- [ ] **Step 2: Checar tipos**

Run: `cd mfes/emprestimo && npx tsc --noEmit`
Expected: sem erros — confirma que nenhum arquivo ainda importa `dto` ou `mappers` (que não existem mais).

- [ ] **Step 3: Confirmar que não sobrou nenhuma referência a `dto`/`mappers`**

Run: `grep -rn "from '../dto'\|from '../mappers'\|from './dto'\|from './mappers'" mfes/emprestimo/src`
Expected: nenhuma saída (grep não encontra ocorrências).

- [ ] **Step 4: Rodar o smoke test manual ponta a ponta do MFE completo pelo Gateway**

Pré-requisito: `gateway/` (plano `2026-07-05-gateway-core.md`) e `bffs/emprestimo/` (Tasks 1–9 deste plano) já implementados e rodando.

Terminal 1: `cd bffs/emprestimo && npm run dev`
Terminal 2: `cd gateway && npm run dev`
Terminal 3: apontar `public/config.json` do shell para `"apiUrl": "http://localhost:4000"` temporariamente e rodar `npm run dev` na raiz do repo.

Fluxo manual no navegador: login → dashboard → MFE de empréstimo → lista de contratos carrega → abrir um contrato → ver extrato → voltar → simular novo empréstimo → escolher linha → informar valores → ver resultado → assinar termo → confirmação de envio.

Expected: todo o fluxo funciona sem erro no console, e `gateway/logs/audit.log` mostra uma linha por requisição com `"targetBff":"emprestimo"`.

Reverter `public/config.json` para `"apiUrl": ""` ao final do teste manual (não commitar a alteração temporária).

---

## Self-Review (registrado para o executor)

- **Cobertura do spec:** transformação de mensagem para **todos** os endpoints do empréstimo (Tasks 2–8), participação no pipeline de auditoria/tráfego do Gateway via smoke test (Tasks 9 e 12), remoção completa de `dto`/`mappers` no MFE sem shim (Tasks 10–11).
- **Sem placeholders:** todo passo tem código completo; os campos de `domain.ts`/`domain/index.ts` cobrem exatamente o que é lido ou escrito por algum ponto de consumo real (nenhum campo de DTO legado com dezenas de propriedades não utilizadas foi copiado para o contrato limpo).
- **Consistência de tipos:** `bffs/emprestimo/src/domain.ts` (Task 3) e a extensão de `mfes/emprestimo/src/domain/index.ts` (Task 10) declaram os mesmos tipos, campo a campo — é o contrato de wire entre os dois pacotes independentes, não código compartilhado. `EmprestimoApi` (Task 10) mantém os mesmos nomes de método e a mesma assinatura de parâmetros que already existiam, só troca o tipo de retorno de `*Dto` para os tipos de `domain`.
- **Entregável independente:** ao final da Task 9, `bffs/emprestimo/` roda sozinho e responde a todas as rotas do contrato limpo (testado via `supertest`, sem depender do Gateway nem do MFE). A migração do MFE (Tasks 10–11) é verificada pela suíte de testes do próprio MFE (Task 12) antes do smoke test manual ponta a ponta.
