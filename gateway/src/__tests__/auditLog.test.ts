import { afterEach, describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { correlationId } from '../correlationId.ts'
import { createAuditLog } from '../auditLog.ts'
import type { GatewayEnv } from '../types.ts'

let tempDir: string | undefined

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

function buildApp(logPath: string) {
  const app = new Hono<GatewayEnv>()
  app.use(correlationId)
  app.use(createAuditLog(logPath, { emprestimo: 'http://localhost:4001' }))
  app.get('/bff/emprestimo/contratos', (c) => c.json([]))
  return app
}

async function readAudit(logPath: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (existsSync(logPath)) {
      const contents = readFileSync(logPath, 'utf-8').trim()
      if (contents) return contents
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('registro de auditoria não foi gravado')
}

describe('createAuditLog', () => {
  it('grava uma linha JSON por requisição com os campos esperados', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-audit-'))
    const logPath = join(tempDir, 'audit.log')
    const app = buildApp(logPath)

    const res = await app.request('/bff/emprestimo/contratos')
    expect(res.status).toBe(200)

    const linhas = (await readAudit(logPath)).split('\n')
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
    const app = new Hono<GatewayEnv>()
    app.use(correlationId)
    app.use(createAuditLog(logPath, { emprestimo: 'http://localhost:4001' }))
    app.get('/saude', (c) => c.json({ ok: true }))

    const res = await app.request('/saude')
    expect(res.status).toBe(200)

    const entry = JSON.parse(await readAudit(logPath))
    expect(entry.targetBff).toBeNull()
  })
})
