# Gateway Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o serviço `gateway/` — porta única de entrada entre os MFEs e os futuros BFFs — com correlação de requisição, controle de tráfego (rate limiting) e auditoria, mais o roteamento por prefixo de path para os BFFs.

**Architecture:** Serviço Express 5 independente (próprio `package.json`), rodando via `node --experimental-strip-types` (mesma técnica já usada em `scripts/deploy.ts` na raiz do repo). Pipeline de middlewares: `correlationId → cors → auditLog (escuta o evento 'finish', não bloqueia) → rateLimit (global + mutações) → proxy por prefixo /bff/<nome>`. O shell (`http://localhost:5173`) chama o Gateway (`http://localhost:4000`) como origem cruzada — por isso o CORS entra cedo no pipeline, antes da auditoria. `createApp(config)` é exportado separado do bootstrap (`index.ts`) para permitir testar com `supertest` sem abrir porta real.

**Tech Stack:** Node.js (`node --experimental-strip-types`), TypeScript, Express 5, `cors`, `express-rate-limit`, `http-proxy-middleware`, Vitest, `supertest`.

## Global Constraints

- Pacote independente: próprio `package.json`, próprio `node_modules`, sem npm workspaces (mesmo padrão de `mfes/emprestimo` e `mfes/endereco`).
- Cobertura de teste ≥80% (lines/functions/branches/statements) — mesmo threshold usado nos MFEs.
- Testes ficam em pastas `__tests__` coladas ao código (padrão já usado em `mfes/emprestimo/src/api/__tests__/`), não em uma pasta `tests/` separada.
- Imports relativos usam extensão `.ts` explícita (`./config.ts`, não `./config`) — exigido pelo loader de type-stripping do Node ao rodar `.ts` diretamente.
- Sem corpo de requisição/resposta nem header `Authorization` no log de auditoria — só metadados de tráfego.
- Sem placeholders: todo arquivo criado abaixo tem conteúdo completo, pronto para rodar.

---

### Task 1: Scaffold do pacote `gateway/` + configuração

**Files:**
- Create: `gateway/package.json`
- Create: `gateway/tsconfig.json`
- Create: `gateway/vitest.config.ts`
- Create: `gateway/src/config.ts`
- Test: `gateway/src/__tests__/config.test.ts`

**Interfaces:**
- Produces: `export interface GatewayConfig { port: number; corsOrigin: string; bffs: Record<string, string>; rateLimit: { windowMs: number; globalMax: number; mutatingMax: number }; auditLogPath: string }` e `export function loadConfig(env?: NodeJS.ProcessEnv): GatewayConfig` — usados por todas as tarefas seguintes deste plano.

- [ ] **Step 1: Criar `gateway/package.json`**

```json
{
  "name": "gateway",
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
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "express-rate-limit": "^7.5.0",
    "http-proxy-middleware": "^3.0.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
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

- [ ] **Step 2: Criar `gateway/tsconfig.json`**

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

- [ ] **Step 3: Criar `gateway/vitest.config.ts`**

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

Run: `cd gateway && npm install`
Expected: instala sem erros, cria `gateway/node_modules` e `gateway/package-lock.json`.

- [ ] **Step 5: Escrever o teste que falha para `loadConfig`**

Create `gateway/src/__tests__/config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config.ts'

describe('loadConfig', () => {
  it('usa valores padrão quando nenhuma env var é definida', () => {
    const config = loadConfig({})

    expect(config.port).toBe(4000)
    expect(config.corsOrigin).toBe('http://localhost:5173')
    expect(config.bffs.emprestimo).toBe('http://localhost:4001')
    expect(config.bffs.endereco).toBe('http://localhost:4002')
    expect(config.rateLimit.windowMs).toBe(60_000)
    expect(config.rateLimit.globalMax).toBe(100)
    expect(config.rateLimit.mutatingMax).toBe(20)
    expect(config.auditLogPath).toBe('logs/audit.log')
  })

  it('usa valores de env var quando definidos', () => {
    const config = loadConfig({
      PORT: '5000',
      CORS_ORIGIN: 'https://portal.exemplo.com',
      BFF_EMPRESTIMO_URL: 'http://bff-emprestimo:4001',
      BFF_ENDERECO_URL: 'http://bff-endereco:4002',
      RATE_LIMIT_GLOBAL_MAX: '50',
      RATE_LIMIT_MUTATING_MAX: '5',
      AUDIT_LOG_PATH: '/var/log/gateway/audit.log',
    })

    expect(config.port).toBe(5000)
    expect(config.corsOrigin).toBe('https://portal.exemplo.com')
    expect(config.bffs.emprestimo).toBe('http://bff-emprestimo:4001')
    expect(config.bffs.endereco).toBe('http://bff-endereco:4002')
    expect(config.rateLimit.globalMax).toBe(50)
    expect(config.rateLimit.mutatingMax).toBe(5)
    expect(config.auditLogPath).toBe('/var/log/gateway/audit.log')
  })
})
```

- [ ] **Step 6: Rodar o teste e confirmar que falha**

Run: `cd gateway && npx vitest run src/__tests__/config.test.ts`
Expected: FAIL — `Cannot find module '../config.ts'` (arquivo ainda não existe).

- [ ] **Step 7: Criar `gateway/src/config.ts`**

```typescript
export interface GatewayConfig {
  port: number
  corsOrigin: string
  bffs: Record<string, string>
  rateLimit: {
    windowMs: number
    globalMax: number
    mutatingMax: number
  }
  auditLogPath: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: Number(env.PORT ?? 4000),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
    bffs: {
      emprestimo: env.BFF_EMPRESTIMO_URL ?? 'http://localhost:4001',
      endereco: env.BFF_ENDERECO_URL ?? 'http://localhost:4002',
    },
    rateLimit: {
      windowMs: 60_000,
      globalMax: Number(env.RATE_LIMIT_GLOBAL_MAX ?? 100),
      mutatingMax: Number(env.RATE_LIMIT_MUTATING_MAX ?? 20),
    },
    auditLogPath: env.AUDIT_LOG_PATH ?? 'logs/audit.log',
  }
}
```

- [ ] **Step 8: Rodar o teste e confirmar que passa**

Run: `cd gateway && npx vitest run src/__tests__/config.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 9: Commit**

```bash
git add gateway/package.json gateway/package-lock.json gateway/tsconfig.json gateway/vitest.config.ts gateway/src/config.ts gateway/src/__tests__/config.test.ts
git commit -m "feat(gateway): scaffold do pacote e configuração via env vars"
```

---

### Task 2: Middleware de correlação (`X-Correlation-Id`)

**Files:**
- Create: `gateway/src/correlationId.ts`
- Test: `gateway/src/__tests__/correlationId.test.ts`

**Interfaces:**
- Consumes: nenhum (usa apenas `express` e `node:crypto`).
- Produces: `export function correlationId(req: Request, res: Response, next: NextFunction): void` — grava o id em `res.locals.correlationId: string` e no header de resposta `X-Correlation-Id`. Todo middleware/rota subsequente lê o id via `res.locals.correlationId`.

- [ ] **Step 1: Escrever o teste que falha**

Create `gateway/src/__tests__/correlationId.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { correlationId } from '../correlationId.ts'

function buildApp() {
  const app = express()
  app.use(correlationId)
  app.get('/ping', (_req, res) => res.json({ ok: true }))
  return app
}

describe('correlationId', () => {
  it('gera um novo correlationId quando nenhum é enviado na requisição', async () => {
    const res = await request(buildApp()).get('/ping')

    expect(res.headers['x-correlation-id']).toBeDefined()
    expect(typeof res.headers['x-correlation-id']).toBe('string')
    expect((res.headers['x-correlation-id'] as string).length).toBeGreaterThan(0)
  })

  it('propaga o correlationId recebido no header da requisição', async () => {
    const res = await request(buildApp())
      .get('/ping')
      .set('X-Correlation-Id', 'meu-id-fixo')

    expect(res.headers['x-correlation-id']).toBe('meu-id-fixo')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd gateway && npx vitest run src/__tests__/correlationId.test.ts`
Expected: FAIL — `Cannot find module '../correlationId.ts'`.

- [ ] **Step 3: Criar `gateway/src/correlationId.ts`**

```typescript
import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-correlation-id')
  const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID()
  res.locals.correlationId = id
  res.setHeader('X-Correlation-Id', id)
  next()
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd gateway && npx vitest run src/__tests__/correlationId.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add gateway/src/correlationId.ts gateway/src/__tests__/correlationId.test.ts
git commit -m "feat(gateway): middleware de correlationId (X-Correlation-Id)"
```

---

### Task 3: Resolução de rota (`resolveTarget`)

**Files:**
- Create: `gateway/src/routing.ts`
- Test: `gateway/src/__tests__/routing.test.ts`

**Interfaces:**
- Consumes: nenhum.
- Produces: `export interface BffTarget { name: string; baseUrl: string }` e `export function resolveTarget(pathname: string, bffs: Record<string, string>): BffTarget | null` — usada por `auditLog.ts` (Task 5, para saber o `targetBff` de cada requisição) e por `proxy.ts` (Task 6).

- [ ] **Step 1: Escrever o teste que falha**

Create `gateway/src/__tests__/routing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { resolveTarget } from '../routing.ts'

const bffs = { emprestimo: 'http://localhost:4001', endereco: 'http://localhost:4002' }

describe('resolveTarget', () => {
  it('resolve o BFF a partir do prefixo /bff/<nome>', () => {
    expect(resolveTarget('/bff/emprestimo/contratos', bffs)).toEqual({
      name: 'emprestimo',
      baseUrl: 'http://localhost:4001',
    })
  })

  it('resolve o BFF mesmo sem sufixo de path', () => {
    expect(resolveTarget('/bff/endereco', bffs)).toEqual({
      name: 'endereco',
      baseUrl: 'http://localhost:4002',
    })
  })

  it('retorna null para um nome de BFF desconhecido', () => {
    expect(resolveTarget('/bff/inexistente/foo', bffs)).toBeNull()
  })

  it('retorna null para path fora do padrão /bff/*', () => {
    expect(resolveTarget('/saude', bffs)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd gateway && npx vitest run src/__tests__/routing.test.ts`
Expected: FAIL — `Cannot find module '../routing.ts'`.

- [ ] **Step 3: Criar `gateway/src/routing.ts`**

```typescript
export interface BffTarget {
  name: string
  baseUrl: string
}

export function resolveTarget(pathname: string, bffs: Record<string, string>): BffTarget | null {
  const match = pathname.match(/^\/bff\/([^/]+)(?:\/.*)?$/)
  if (!match) return null

  const name = match[1]
  const baseUrl = bffs[name]
  if (!baseUrl) return null

  return { name, baseUrl }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd gateway && npx vitest run src/__tests__/routing.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add gateway/src/routing.ts gateway/src/__tests__/routing.test.ts
git commit -m "feat(gateway): resolução do BFF alvo a partir do path /bff/<nome>"
```

---

### Task 4: Controle de tráfego (rate limiting)

**Files:**
- Create: `gateway/src/rateLimit.ts`
- Test: `gateway/src/__tests__/rateLimit.test.ts`

**Interfaces:**
- Consumes: `res.locals.correlationId` (populado por `correlationId`, Task 2).
- Produces: `export interface RateLimitOptions { windowMs: number; globalMax: number; mutatingMax: number }` e `export function createRateLimiters(opts: RateLimitOptions): { global: RequestHandler; mutating: RequestHandler }` — consumido por `app.ts` (Task 6).

- [ ] **Step 1: Escrever o teste que falha**

Create `gateway/src/__tests__/rateLimit.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { correlationId } from '../correlationId.ts'
import { createRateLimiters } from '../rateLimit.ts'

function buildApp(opts: { windowMs: number; globalMax: number; mutatingMax: number }) {
  const app = express()
  app.use(correlationId)
  const { global, mutating } = createRateLimiters(opts)
  app.use(global)
  app.use(mutating)
  app.get('/ping', (_req, res) => res.json({ ok: true }))
  app.post('/ping', (_req, res) => res.json({ ok: true }))
  return app
}

describe('createRateLimiters', () => {
  it('bloqueia com 429 após exceder o limite global', async () => {
    const app = buildApp({ windowMs: 60_000, globalMax: 2, mutatingMax: 10 })

    await request(app).get('/ping').expect(200)
    await request(app).get('/ping').expect(200)
    const res = await request(app).get('/ping')

    expect(res.status).toBe(429)
    expect(res.body).toEqual({
      error: 'rate_limit_exceeded',
      message: 'Limite de requisições excedido.',
      correlationId: expect.any(String),
    })
  })

  it('aplica um limite mais restrito para métodos de mutação', async () => {
    const app = buildApp({ windowMs: 60_000, globalMax: 10, mutatingMax: 1 })

    await request(app).post('/ping').expect(200)
    const res = await request(app).post('/ping')

    expect(res.status).toBe(429)
  })

  it('não aplica o limite de mutação a métodos de leitura', async () => {
    const app = buildApp({ windowMs: 60_000, globalMax: 10, mutatingMax: 1 })

    await request(app).get('/ping').expect(200)
    await request(app).get('/ping').expect(200)
    await request(app).get('/ping').expect(200)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd gateway && npx vitest run src/__tests__/rateLimit.test.ts`
Expected: FAIL — `Cannot find module '../rateLimit.ts'`.

- [ ] **Step 3: Criar `gateway/src/rateLimit.ts`**

```typescript
import rateLimit from 'express-rate-limit'
import type { Request, RequestHandler, Response } from 'express'

export interface RateLimitOptions {
  windowMs: number
  globalMax: number
  mutatingMax: number
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

function tooManyRequests(_req: Request, res: Response): void {
  res.status(429).json({
    error: 'rate_limit_exceeded',
    message: 'Limite de requisições excedido.',
    correlationId: res.locals.correlationId as string,
  })
}

export function createRateLimiters(
  opts: RateLimitOptions,
): { global: RequestHandler; mutating: RequestHandler } {
  const global = rateLimit({
    windowMs: opts.windowMs,
    limit: opts.globalMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
  })

  const mutating = rateLimit({
    windowMs: opts.windowMs,
    limit: opts.mutatingMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
    skip: (req) => !MUTATING_METHODS.has(req.method),
  })

  return { global, mutating }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd gateway && npx vitest run src/__tests__/rateLimit.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add gateway/src/rateLimit.ts gateway/src/__tests__/rateLimit.test.ts
git commit -m "feat(gateway): controle de tráfego com limites global e de mutação"
```

---

### Task 5: Auditoria (log de tráfego em JSON lines)

**Files:**
- Create: `gateway/src/auditLog.ts`
- Test: `gateway/src/__tests__/auditLog.test.ts`

**Interfaces:**
- Consumes: `res.locals.correlationId` (Task 2), `resolveTarget` de `./routing.ts` (Task 3).
- Produces: `export interface AuditEntry { timestamp: string; correlationId: string; method: string; path: string; targetBff: string | null; status: number; durationMs: number; clientIp: string }` e `export function createAuditLog(logPath: string, bffs: Record<string, string>): RequestHandler` — consumido por `app.ts` (Task 6).

- [ ] **Step 1: Escrever o teste que falha**

Create `gateway/src/__tests__/auditLog.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { correlationId } from '../correlationId.ts'
import { createAuditLog } from '../auditLog.ts'

let tempDir: string | undefined

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

function buildApp(logPath: string) {
  const app = express()
  app.use(correlationId)
  app.use(createAuditLog(logPath, { emprestimo: 'http://localhost:4001' }))
  app.get('/bff/emprestimo/contratos', (_req, res) => res.json([]))
  return app
}

describe('createAuditLog', () => {
  it('grava uma linha JSON por requisição com os campos esperados', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-audit-'))
    const logPath = join(tempDir, 'audit.log')
    const app = buildApp(logPath)

    await request(app).get('/bff/emprestimo/contratos').expect(200)

    const linhas = readFileSync(logPath, 'utf-8').trim().split('\n')
    expect(linhas).toHaveLength(1)

    const entry = JSON.parse(linhas[0])
    expect(entry).toMatchObject({
      method: 'GET',
      path: '/bff/emprestimo/contratos',
      targetBff: 'emprestimo',
      status: 200,
    })
    expect(entry.correlationId).toEqual(expect.any(String))
    expect(entry.durationMs).toEqual(expect.any(Number))
    expect(entry.timestamp).toEqual(expect.any(String))
  })

  it('registra targetBff nulo para uma rota fora do padrão /bff/*', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-audit-'))
    const logPath = join(tempDir, 'audit.log')
    const app = express()
    app.use(correlationId)
    app.use(createAuditLog(logPath, { emprestimo: 'http://localhost:4001' }))
    app.get('/saude', (_req, res) => res.json({ ok: true }))

    await request(app).get('/saude').expect(200)

    const entry = JSON.parse(readFileSync(logPath, 'utf-8').trim())
    expect(entry.targetBff).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd gateway && npx vitest run src/__tests__/auditLog.test.ts`
Expected: FAIL — `Cannot find module '../auditLog.ts'`.

- [ ] **Step 3: Criar `gateway/src/auditLog.ts`**

```typescript
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { resolveTarget } from './routing.ts'

export interface AuditEntry {
  timestamp: string
  correlationId: string
  method: string
  path: string
  targetBff: string | null
  status: number
  durationMs: number
  clientIp: string
}

export function createAuditLog(logPath: string, bffs: Record<string, string>): RequestHandler {
  mkdirSync(dirname(logPath), { recursive: true })

  return function auditLog(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint()

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - startedAt
      const target = resolveTarget(req.path, bffs)

      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        correlationId: res.locals.correlationId as string,
        method: req.method,
        path: req.path,
        targetBff: target?.name ?? null,
        status: res.statusCode,
        durationMs: Math.round(Number(durationNs) / 1000) / 1000,
        clientIp: req.ip ?? 'unknown',
      }

      appendFileSync(logPath, `${JSON.stringify(entry)}\n`)
    })

    next()
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd gateway && npx vitest run src/__tests__/auditLog.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add gateway/src/auditLog.ts gateway/src/__tests__/auditLog.test.ts
git commit -m "feat(gateway): auditoria de tráfego em JSON lines"
```

---

### Task 6: Roteamento/proxy para os BFFs + montagem do app

**Files:**
- Create: `gateway/src/proxy.ts`
- Create: `gateway/src/app.ts`
- Test: `gateway/src/__tests__/app.test.ts`

**Interfaces:**
- Consumes: `correlationId` (Task 2), `createAuditLog` (Task 5), `createRateLimiters` (Task 4), `GatewayConfig` (Task 1, inclui `corsOrigin`).
- Produces: `export function createProxyRouter(bffs: Record<string, string>): Router` e `export function createApp(config: GatewayConfig): Application` — `createApp` é o que `index.ts` (Task 7) usa para subir o servidor, e é o que os testes de integração usam via `supertest`.

- [ ] **Step 1: Escrever o teste que falha**

Create `gateway/src/__tests__/app.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../app.ts'
import type { GatewayConfig } from '../config.ts'

let fakeBff: Server | undefined
let tempDir: string | undefined

afterEach(async () => {
  if (fakeBff) await new Promise<void>((resolve) => fakeBff!.close(() => resolve()))
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  fakeBff = undefined
  tempDir = undefined
})

function startFakeBff(): Promise<string> {
  return new Promise((resolve) => {
    fakeBff = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ path: req.url, method: req.method }))
    })
    fakeBff.listen(0, () => {
      const { port } = fakeBff!.address() as AddressInfo
      resolve(`http://127.0.0.1:${port}`)
    })
  })
}

function buildConfig(bffs: Record<string, string>): GatewayConfig {
  tempDir = mkdtempSync(join(tmpdir(), 'gateway-app-'))
  return {
    port: 0,
    corsOrigin: 'http://localhost:5173',
    bffs,
    rateLimit: { windowMs: 60_000, globalMax: 100, mutatingMax: 20 },
    auditLogPath: join(tempDir, 'audit.log'),
  }
}

describe('createApp', () => {
  it('encaminha para o BFF correto e reescreve o prefixo /bff/<nome>', async () => {
    const bffUrl = await startFakeBff()
    const config = buildConfig({ emprestimo: bffUrl })

    const res = await request(createApp(config)).get('/bff/emprestimo/contratos')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ path: '/contratos', method: 'GET' })
  })

  it('responde 404 para um BFF desconhecido', async () => {
    const config = buildConfig({})

    const res = await request(createApp(config)).get('/bff/inexistente/foo')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })

  it('libera CORS para a origem configurada', async () => {
    const config = buildConfig({})

    const res = await request(createApp(config))
      .get('/bff/inexistente/foo')
      .set('Origin', 'http://localhost:5173')

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd gateway && npx vitest run src/__tests__/app.test.ts`
Expected: FAIL — `Cannot find module '../app.ts'`.

- [ ] **Step 3: Criar `gateway/src/proxy.ts`**

```typescript
import { Router } from 'express'
import type { Response } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

export function createProxyRouter(bffs: Record<string, string>): Router {
  const router = Router()

  for (const [name, target] of Object.entries(bffs)) {
    router.use(
      `/bff/${name}`,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^/bff/${name}`]: '' },
        on: {
          proxyReq: (proxyReq, _req, res) => {
            const correlationId = (res as unknown as Response).locals.correlationId as string
            proxyReq.setHeader('X-Correlation-Id', correlationId)
          },
        },
      }),
    )
  }

  router.use((_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'Rota não encontrada.',
      correlationId: res.locals.correlationId as string,
    })
  })

  return router
}
```

- [ ] **Step 4: Criar `gateway/src/app.ts`**

```typescript
import cors from 'cors'
import express from 'express'
import type { Application } from 'express'
import { correlationId } from './correlationId.ts'
import { createAuditLog } from './auditLog.ts'
import { createRateLimiters } from './rateLimit.ts'
import { createProxyRouter } from './proxy.ts'
import type { GatewayConfig } from './config.ts'

export function createApp(config: GatewayConfig): Application {
  const app = express()

  app.use(correlationId)
  app.use(cors({ origin: config.corsOrigin }))
  app.use(createAuditLog(config.auditLogPath, config.bffs))

  const { global, mutating } = createRateLimiters(config.rateLimit)
  app.use(global)
  app.use(mutating)

  app.use(createProxyRouter(config.bffs))

  return app
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd gateway && npx vitest run src/__tests__/app.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add gateway/src/proxy.ts gateway/src/app.ts gateway/src/__tests__/app.test.ts
git commit -m "feat(gateway): roteamento/proxy por prefixo /bff/<nome> e montagem do app"
```

---

### Task 7: Bootstrap do servidor e verificação de cobertura

**Files:**
- Create: `gateway/src/index.ts`
- Create: `gateway/README.md`

**Interfaces:**
- Consumes: `createApp` (Task 6), `loadConfig` (Task 1).
- Produces: processo HTTP ouvindo em `config.port` — ponto de entrada real do serviço, usado pelo Plano de infra (docker-compose) e por quem for testar manualmente.

- [ ] **Step 1: Criar `gateway/src/index.ts`**

```typescript
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp(config)

app.listen(config.port, () => {
  console.log(`Gateway ouvindo em http://localhost:${config.port}`)
})
```

- [ ] **Step 2: Rodar a suíte completa e checar cobertura**

Run: `cd gateway && npm run test:coverage`
Expected: todos os testes PASS; cobertura de `src/**` (excluindo `src/__tests__/**` e `src/index.ts`) ≥80% em lines/functions/branches/statements.

- [ ] **Step 3: Checar tipos**

Run: `cd gateway && npm run type-check`
Expected: sem erros.

- [ ] **Step 4: Smoke test manual**

Run em um terminal: `cd gateway && npm run dev`
Em outro terminal:
```bash
curl -i http://localhost:4000/bff/inexistente/foo
```
Expected: `HTTP/1.1 404`, corpo `{"error":"not_found",...}`, header `X-Correlation-Id` presente na resposta.

Confirmar que uma linha foi gravada: `cat gateway/logs/audit.log` deve mostrar uma entrada JSON com `"path":"/bff/inexistente/foo"` e `"status":404`.

Encerrar o servidor com `Ctrl+C`.

- [ ] **Step 5: Criar `gateway/README.md`**

```markdown
# gateway

## Responsabilidade

Porta única de entrada da plataforma entre os MFEs e os BFFs. Aplica correlação de requisição, controle de tráfego (rate limiting) e auditoria antes de rotear cada requisição, por prefixo de path, ao BFF correspondente.

## Estrutura

| Arquivo | Descrição |
|---|---|
| [`src/config.ts`](./src/config.ts) | Configuração via variáveis de ambiente (porta, URLs dos BFFs, limites de tráfego, caminho do log de auditoria) |
| [`src/correlationId.ts`](./src/correlationId.ts) | Gera/propaga `X-Correlation-Id` por requisição |
| [`src/rateLimit.ts`](./src/rateLimit.ts) | Limites de tráfego global e de mutação (POST/PUT/DELETE/PATCH) |
| [`src/auditLog.ts`](./src/auditLog.ts) | Grava uma linha JSON por requisição em `logs/audit.log` |
| [`src/routing.ts`](./src/routing.ts) | Resolve o BFF alvo a partir do prefixo `/bff/<nome>` |
| [`src/proxy.ts`](./src/proxy.ts) | Roteia/encaminha para o BFF, reescrevendo o prefixo |
| [`src/app.ts`](./src/app.ts) | Monta o pipeline de middlewares — usado pelos testes via `supertest` |
| [`src/index.ts`](./src/index.ts) | Bootstrap: sobe o servidor HTTP |

## Como usar

```bash
npm install
npm run dev     # http://localhost:4000, recarrega em mudanças
npm test
npm run test:coverage
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do Gateway | `4000` |
| `CORS_ORIGIN` | Origem liberada para chamadas cross-origin (o shell) | `http://localhost:5173` |
| `BFF_EMPRESTIMO_URL` | URL base do BFF de empréstimo | `http://localhost:4001` |
| `BFF_ENDERECO_URL` | URL base do BFF de endereço | `http://localhost:4002` |
| `RATE_LIMIT_GLOBAL_MAX` | Requisições/minuto por IP (todas as rotas) | `100` |
| `RATE_LIMIT_MUTATING_MAX` | Requisições/minuto por IP para POST/PUT/DELETE/PATCH | `20` |
| `AUDIT_LOG_PATH` | Caminho do arquivo de auditoria (JSON lines) | `logs/audit.log` |

## Decisões relevantes

- [ADR-015](../docs/architecture/adrs/ADR-015-gateway-api-e-bff.md) — Gateway de API com BFFs
```

- [ ] **Step 6: Commit**

```bash
git add gateway/src/index.ts gateway/README.md
git commit -m "feat(gateway): bootstrap do servidor e README do serviço"
```

---

## Self-Review (registrado para o executor)

- **Cobertura do spec:** correlação (Task 2), controle de tráfego (Task 4), auditoria (Task 5) e roteamento por prefixo (Task 6) — as três responsabilidades do Gateway descritas no spec estão cobertas.
- **Sem placeholders:** todo passo tem código completo; nenhum "adicionar tratamento depois".
- **Consistência de tipos:** `GatewayConfig` (Task 1) é o único tipo de configuração, consumido sem alteração de forma por `createAuditLog`, `createRateLimiters` e `createApp`. `res.locals.correlationId: string` é o único mecanismo de propagação do id entre middlewares, usado de forma consistente em `correlationId.ts`, `rateLimit.ts`, `auditLog.ts` e `proxy.ts`.
- **Entregável independente:** ao final deste plano, `gateway/` roda sozinho (`npm run dev`), responde 404 para qualquer BFF ainda não configurado, audita toda requisição e aplica rate limit — testável via `supertest` mesmo sem nenhum BFF real no ar (Task 6 usa um servidor HTTP fake como downstream).
