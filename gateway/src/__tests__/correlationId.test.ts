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
