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
