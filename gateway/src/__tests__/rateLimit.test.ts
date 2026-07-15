import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { correlationId } from '../correlationId.ts'
import { createRateLimiters } from '../rateLimit.ts'
import type { GatewayEnv } from '../types.ts'

function buildApp(opts: { windowMs: number; globalMax: number; mutatingMax: number }) {
  const app = new Hono<GatewayEnv>()
  app.use(correlationId)
  const { global, mutating } = createRateLimiters(opts)
  app.use(global)
  app.use(mutating)
  app.get('/ping', (c) => c.json({ ok: true }))
  app.post('/ping', (c) => c.json({ ok: true }))
  return app
}

describe('createRateLimiters', () => {
  it('bloqueia com 429 após exceder o limite global', async () => {
    const app = buildApp({ windowMs: 60_000, globalMax: 2, mutatingMax: 10 })

    expect((await app.request('/ping')).status).toBe(200)
    expect((await app.request('/ping')).status).toBe(200)
    const res = await app.request('/ping')

    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({
      error: 'rate_limit_exceeded',
      message: 'Limite de requisições excedido.',
      correlationId: expect.any(String),
    })
  })

  it('aplica um limite mais restrito para métodos de mutação', async () => {
    const app = buildApp({ windowMs: 60_000, globalMax: 10, mutatingMax: 1 })

    expect((await app.request('/ping', { method: 'POST' })).status).toBe(200)
    const res = await app.request('/ping', { method: 'POST' })

    expect(res.status).toBe(429)
  })

  it('não aplica o limite de mutação a métodos de leitura', async () => {
    const app = buildApp({ windowMs: 60_000, globalMax: 10, mutatingMax: 1 })

    expect((await app.request('/ping')).status).toBe(200)
    expect((await app.request('/ping')).status).toBe(200)
    expect((await app.request('/ping')).status).toBe(200)
  })
})
