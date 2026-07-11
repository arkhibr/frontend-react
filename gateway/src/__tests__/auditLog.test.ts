import { afterEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
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

    await request(app).get('/bff/emprestimo/contratos').expect(200)

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
    const app = express()
    app.use(correlationId)
    app.use(createAuditLog(logPath, { emprestimo: 'http://localhost:4001' }))
    app.get('/saude', (_req, res) => res.json({ ok: true }))

    await request(app).get('/saude').expect(200)

    const entry = JSON.parse(await readAudit(logPath))
    expect(entry.targetBff).toBeNull()
  })

  it('registra o path original quando um sub-router monta em prefixo e finaliza sem chamar next (como o proxy real)', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-audit-'))
    const logPath = join(tempDir, 'audit.log')
    const app = express()
    app.use(correlationId)
    app.use(createAuditLog(logPath, { emprestimo: 'http://localhost:4001' }))

    const subRouter = express.Router()
    // Mimic http-proxy-middleware: finaliza a resposta diretamente, sem chamar next(),
    // deixando req.url/req.path com o prefixo '/bff/emprestimo' já removido pelo Express.
    subRouter.get('/contratos', (_req, res) => {
      res.json([])
    })
    app.use('/bff/emprestimo', subRouter)

    await request(app).get('/bff/emprestimo/contratos').expect(200)

    const entry = JSON.parse(await readAudit(logPath))
    expect(entry.path).toBe('/bff/emprestimo/contratos')
    expect(entry.targetBff).toBe('emprestimo')
  })
})
