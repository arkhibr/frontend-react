import { afterEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SignJWT } from 'jose'
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
      res.end(JSON.stringify({
        path: req.url,
        method: req.method,
        subject: req.headers['x-authenticated-subject'],
        internalKey: req.headers['x-internal-gateway-key'],
        authorization: req.headers.authorization,
      }))
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
    auth: { issuer: 'portal-test', audience: 'portal-api', sharedSecret: 'test-shared-secret' },
    internalGatewayKey: 'test-gateway-key',
    rateLimit: { windowMs: 60_000, globalMax: 100, mutatingMax: 20 },
    auditLogPath: join(tempDir, 'audit.log'),
  }
}

async function token(sub = 'user1'): Promise<string> {
  return new SignJWT({ roles: ['cliente'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer('portal-test')
    .setAudience('portal-api')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode('test-shared-secret'))
}

describe('createApp', () => {
  it('encaminha para o BFF correto e reescreve o prefixo /bff/<nome>', async () => {
    const bffUrl = await startFakeBff()
    const config = buildConfig({ emprestimo: bffUrl })

    const res = await createApp(config).request('/bff/emprestimo/contratos', {
      headers: { Authorization: `Bearer ${await token()}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ path: '/contratos', method: 'GET', subject: 'user1', internalKey: 'test-gateway-key' })
    expect(body).not.toHaveProperty('authorization')
  })

  it('responde 404 para um BFF desconhecido', async () => {
    const config = buildConfig({})

    const res = await createApp(config).request('/bff/inexistente/foo', {
      headers: { Authorization: `Bearer ${await token()}` },
    })

    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('not_found')
  })

  it('libera CORS para a origem configurada', async () => {
    const config = buildConfig({})

    const res = await createApp(config).request('/bff/inexistente/foo', {
      headers: {
        Origin: 'http://localhost:5173',
        Authorization: `Bearer ${await token()}`,
      },
    })

    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('rejeita token ausente ou inválido antes de chamar o BFF', async () => {
    const config = buildConfig({})
    expect((await createApp(config).request('/bff/emprestimo/contratos')).status).toBe(401)
    expect((await createApp(config).request('/bff/emprestimo/contratos', {
      headers: { Authorization: 'Bearer x.e30.x' },
    })).status).toBe(401)
  })
})
