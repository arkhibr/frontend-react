# BFF-endereco Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o serviço `bffs/endereco/` — o BFF do MFE de endereço — e verificar, com um smoke test manual, que ele funciona ponta a ponta atrás do Gateway (`gateway/`, já implementado pelo plano `2026-07-05-gateway-core.md`).

**Architecture:** Serviço Express 5 independente, mesmo padrão de `gateway/` (próprio `package.json`, roda via `node --experimental-strip-types`). Expõe `GET /usuario/endereco` e `PUT /usuario/endereco` — o mesmo contrato que o MFE de endereço já consome hoje via MSW (`src/mocks/handlers.ts`). O contrato de `/usuario/endereco` já é limpo (`{ cep, logradouro, numero }`), então este BFF não remodela payload — sua função é participar do pipeline do Gateway (auditoria e controle de tráfego se aplicam a ele mesmo sem transformação de mensagem). O "back-end legado" é uma função em memória (`legacyBackend.ts`) que replica o comportamento hoje simulado pelo MSW: `GET` sempre retorna o mesmo endereço fixo, `PUT` ecoa o corpo recebido (sem persistir) — paridade exata com o comportamento atual, nada de novo é adicionado.

**Tech Stack:** Node.js (`node --experimental-strip-types`), TypeScript, Express 5, Vitest, `supertest`.

## Global Constraints

- Pacote independente: próprio `package.json`, próprio `node_modules`, sem npm workspaces.
- Cobertura de teste ≥80% (lines/functions/branches/statements).
- Testes em pastas `__tests__` coladas ao código.
- Imports relativos com extensão `.ts` explícita.
- Sem placeholders: todo arquivo criado abaixo tem conteúdo completo.
- Este BFF roda atrás do Gateway do plano `2026-07-05-gateway-core.md` — suas rotas não incluem o prefixo `/bff/endereco` (o Gateway já removeu esse prefixo antes de encaminhar).

---

### Task 1: Scaffold do pacote `bffs/endereco/` + configuração

**Files:**
- Create: `bffs/endereco/package.json`
- Create: `bffs/endereco/tsconfig.json`
- Create: `bffs/endereco/vitest.config.ts`
- Create: `bffs/endereco/src/config.ts`
- Test: `bffs/endereco/src/__tests__/config.test.ts`

**Interfaces:**
- Produces: `export interface BffConfig { port: number }` e `export function loadConfig(env?: NodeJS.ProcessEnv): BffConfig` — usados pelas tarefas seguintes.

- [ ] **Step 1: Criar `bffs/endereco/package.json`**

```json
{
  "name": "bff-endereco",
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

- [ ] **Step 2: Criar `bffs/endereco/tsconfig.json`**

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

- [ ] **Step 3: Criar `bffs/endereco/vitest.config.ts`**

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
      exclude: ['src/__tests__/**', 'src/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
```

- [ ] **Step 4: Instalar dependências**

Run: `cd bffs/endereco && npm install`
Expected: instala sem erros, cria `bffs/endereco/node_modules` e `bffs/endereco/package-lock.json`.

- [ ] **Step 5: Escrever o teste que falha**

Create `bffs/endereco/src/__tests__/config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config.ts'

describe('loadConfig', () => {
  it('usa a porta padrão quando PORT não é definida', () => {
    expect(loadConfig({}).port).toBe(4002)
  })

  it('usa PORT quando definida', () => {
    expect(loadConfig({ PORT: '9000' }).port).toBe(9000)
  })
})
```

- [ ] **Step 6: Rodar o teste e confirmar que falha**

Run: `cd bffs/endereco && npx vitest run src/__tests__/config.test.ts`
Expected: FAIL — `Cannot find module '../config.ts'`.

- [ ] **Step 7: Criar `bffs/endereco/src/config.ts`**

```typescript
export interface BffConfig {
  port: number
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  return {
    port: Number(env.PORT ?? 4002),
  }
}
```

- [ ] **Step 8: Rodar o teste e confirmar que passa**

Run: `cd bffs/endereco && npx vitest run src/__tests__/config.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 9: Commit**

```bash
git add bffs/endereco/package.json bffs/endereco/package-lock.json bffs/endereco/tsconfig.json bffs/endereco/vitest.config.ts bffs/endereco/src/config.ts bffs/endereco/src/__tests__/config.test.ts
git commit -m "feat(bff-endereco): scaffold do pacote e configuração via env vars"
```

---

### Task 2: Back-end legado simulado (`legacyBackend.ts`)

**Files:**
- Create: `bffs/endereco/src/legacyBackend.ts`
- Test: `bffs/endereco/src/__tests__/legacyBackend.test.ts`

**Interfaces:**
- Consumes: nenhum.
- Produces: `export interface Endereco { cep: string; logradouro: string; numero: string }`, `export function getEndereco(): Endereco`, `export function putEndereco(input: Endereco): Endereco` — usados por `routes.ts` (Task 3).

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/endereco/src/__tests__/legacyBackend.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getEndereco, putEndereco } from '../legacyBackend.ts'

describe('legacyBackend', () => {
  it('getEndereco retorna o endereço fixo simulado', () => {
    expect(getEndereco()).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
    })
  })

  it('putEndereco ecoa o endereço recebido', () => {
    const input = { cep: '04567000', logradouro: 'Av. Paulista', numero: '1000' }
    expect(putEndereco(input)).toEqual(input)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/endereco && npx vitest run src/__tests__/legacyBackend.test.ts`
Expected: FAIL — `Cannot find module '../legacyBackend.ts'`.

- [ ] **Step 3: Criar `bffs/endereco/src/legacyBackend.ts`**

```typescript
export interface Endereco {
  cep: string
  logradouro: string
  numero: string
}

const ENDERECO_FIXO: Endereco = {
  cep: '01001000',
  logradouro: 'Praça da Sé',
  numero: '1',
}

export function getEndereco(): Endereco {
  return { ...ENDERECO_FIXO }
}

export function putEndereco(input: Endereco): Endereco {
  return { ...input }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd bffs/endereco && npx vitest run src/__tests__/legacyBackend.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add bffs/endereco/src/legacyBackend.ts bffs/endereco/src/__tests__/legacyBackend.test.ts
git commit -m "feat(bff-endereco): back-end legado simulado (fixture em memória)"
```

---

### Task 3: Rotas HTTP e montagem do app

**Files:**
- Create: `bffs/endereco/src/routes.ts`
- Create: `bffs/endereco/src/app.ts`
- Test: `bffs/endereco/src/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: `getEndereco`, `putEndereco`, `Endereco` (Task 2).
- Produces: `export function createRoutes(): Router` e `export function createApp(): Application` — `createApp` é usado por `index.ts` (Task 4).

- [ ] **Step 1: Escrever o teste que falha**

Create `bffs/endereco/src/__tests__/routes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.ts'

describe('rotas de endereco', () => {
  it('GET /usuario/endereco retorna o endereço simulado', async () => {
    const res = await request(createApp()).get('/usuario/endereco')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
    })
  })

  it('PUT /usuario/endereco ecoa o corpo enviado', async () => {
    const novoEndereco = { cep: '04567000', logradouro: 'Av. Paulista', numero: '1000' }

    const res = await request(createApp())
      .put('/usuario/endereco')
      .send(novoEndereco)

    expect(res.status).toBe(200)
    expect(res.body).toEqual(novoEndereco)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd bffs/endereco && npx vitest run src/__tests__/routes.test.ts`
Expected: FAIL — `Cannot find module '../app.ts'`.

- [ ] **Step 3: Criar `bffs/endereco/src/routes.ts`**

```typescript
import { Router } from 'express'
import { getEndereco, putEndereco } from './legacyBackend.ts'
import type { Endereco } from './legacyBackend.ts'

export function createRoutes(): Router {
  const router = Router()

  router.get('/usuario/endereco', (_req, res) => {
    res.json(getEndereco())
  })

  router.put('/usuario/endereco', (req, res) => {
    res.json(putEndereco(req.body as Endereco))
  })

  return router
}
```

- [ ] **Step 4: Criar `bffs/endereco/src/app.ts`**

```typescript
import express from 'express'
import type { Application } from 'express'
import { createRoutes } from './routes.ts'

export function createApp(): Application {
  const app = express()
  app.use(express.json())
  app.use(createRoutes())
  return app
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd bffs/endereco && npx vitest run src/__tests__/routes.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add bffs/endereco/src/routes.ts bffs/endereco/src/app.ts bffs/endereco/src/__tests__/routes.test.ts
git commit -m "feat(bff-endereco): rotas GET/PUT /usuario/endereco"
```

---

### Task 4: Bootstrap, README e verificação ponta a ponta com o Gateway

**Files:**
- Create: `bffs/endereco/src/index.ts`
- Create: `bffs/endereco/README.md`

**Interfaces:**
- Consumes: `createApp` (Task 3), `loadConfig` (Task 1).
- Produces: processo HTTP ouvindo em `config.port` — este é o serviço que o Gateway (`BFF_ENDERECO_URL`, padrão `http://localhost:4002`) encaminha requisições `/bff/endereco/*`.

- [ ] **Step 1: Criar `bffs/endereco/src/index.ts`**

```typescript
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp()

app.listen(config.port, () => {
  console.log(`BFF-endereco ouvindo em http://localhost:${config.port}`)
})
```

- [ ] **Step 2: Rodar a suíte completa e checar cobertura**

Run: `cd bffs/endereco && npm run test:coverage`
Expected: todos os testes PASS; cobertura ≥80% em lines/functions/branches/statements.

- [ ] **Step 3: Checar tipos**

Run: `cd bffs/endereco && npm run type-check`
Expected: sem erros.

- [ ] **Step 4: Criar `bffs/endereco/README.md`**

```markdown
# bff-endereco

## Responsabilidade

BFF (Backend for Frontend) do MFE de endereço. Expõe `GET`/`PUT /usuario/endereco` — o mesmo contrato já consumido pelo MFE hoje via MSW. Não remodela payload (o contrato já é limpo); participa do pipeline do Gateway para exercitar auditoria e controle de tráfego mesmo sem transformação de mensagem.

## Estrutura

| Arquivo | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Porta do serviço via variável de ambiente |
| [`src/legacyBackend.ts`](./src/legacyBackend.ts) | Back-end legado simulado (fixture em memória) |
| [`src/routes.ts`](./src/routes.ts) | Rotas `GET`/`PUT /usuario/endereco` |
| [`src/app.ts`](./src/app.ts) | Monta o app Express — usado pelos testes via `supertest` |
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

## Decisões relevantes

- [ADR-015](../../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
```

- [ ] **Step 5: Commit**

```bash
git add bffs/endereco/src/index.ts bffs/endereco/README.md
git commit -m "feat(bff-endereco): bootstrap do servidor e README do serviço"
```

- [ ] **Step 6: Smoke test manual ponta a ponta (Gateway + BFF-endereco)**

Pré-requisito: o plano `2026-07-05-gateway-core.md` já foi executado (pacote `gateway/` existe).

Terminal 1:
```bash
cd bffs/endereco && npm run dev
```

Terminal 2:
```bash
cd gateway && npm run dev
```

Terminal 3:
```bash
curl -i http://localhost:4000/bff/endereco/usuario/endereco
```
Expected: `HTTP/1.1 200`, corpo `{"cep":"01001000","logradouro":"Praça da Sé","numero":"1"}`, header `X-Correlation-Id` presente.

```bash
curl -i -X PUT http://localhost:4000/bff/endereco/usuario/endereco \
  -H "Content-Type: application/json" \
  -d '{"cep":"04567000","logradouro":"Av. Paulista","numero":"1000"}'
```
Expected: `HTTP/1.1 200`, corpo ecoa o JSON enviado.

Confirmar auditoria: `cat gateway/logs/audit.log` deve conter duas novas linhas, com `"targetBff":"endereco"` e `"path":"/bff/endereco/usuario/endereco"`.

Encerrar os dois servidores com `Ctrl+C`.

---

## Self-Review (registrado para o executor)

- **Cobertura do spec:** BFF-endereco como "BFF sem transformação pesada" está coberto (Task 2/3); a participação no pipeline de auditoria/tráfego do Gateway é verificada pelo smoke test da Task 4 (Step 6), já que essas responsabilidades vivem no Gateway, não neste pacote.
- **Sem placeholders:** todo passo tem código completo.
- **Consistência de tipos:** `Endereco` é definido uma única vez em `legacyBackend.ts` e reexportado/consumido sem alteração de forma por `routes.ts`; é estruturalmente idêntico ao `Endereco` já definido em `mfes/endereco/src/EnderecoForm.tsx` (não há necessidade de alterar o MFE — o contrato de wire não muda).
- **Entregável independente:** ao final deste plano, `bffs/endereco/` roda sozinho e responde `GET`/`PUT /usuario/endereco` (Task 3 testa isso isoladamente); o Step 6 da Task 4 prova a composição real com o Gateway.
