import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { correlationId } from '../correlationId.ts'
import type { GatewayEnv } from '../types.ts'

function buildApp() {
  const app = new Hono<GatewayEnv>()
  app.use(correlationId)
  app.get('/ping', (c) => c.json({ ok: true }))
  return app
}

describe('correlationId', () => {
  it('gera um novo correlationId quando nenhum é enviado na requisição', async () => {
    const res = await buildApp().request('/ping')

    const id = res.headers.get('x-correlation-id')
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect((id as string).length).toBeGreaterThan(0)
  })

  it('propaga o correlationId recebido no header da requisição', async () => {
    const res = await buildApp().request('/ping', {
      headers: { 'X-Correlation-Id': 'meu-id-fixo' },
    })

    expect(res.headers.get('x-correlation-id')).toBe('meu-id-fixo')
  })
})
