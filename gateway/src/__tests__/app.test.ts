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
