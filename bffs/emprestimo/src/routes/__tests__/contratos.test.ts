import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createContratosRouter } from '../contratos.ts'
import type { BffEnv } from '../../types.ts'

function buildApp() {
  const app = new Hono<BffEnv>()
  app.use(async (c, next) => {
    c.set('auth', { sub: 'user1', roles: [] })
    await next()
  })
  app.route('/', createContratosRouter())
  return app
}

describe('rotas de contratos', () => {
  it('GET /contratos retorna a lista em camelCase', async () => {
    const res = await buildApp().request('/contratos')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({ numero: '123456-7', linhaDeCredito: 'Crédito Pessoal', saldoAtual: 9245.5 })
    expect(body[0].CodigoDaLinha).toBeUndefined()
    expect(body[1]).toMatchObject({ numero: '654321-0', temAtraso: true })
  })

  it('GET /contratos/:id retorna o detalhe em camelCase para um contrato do usuário', async () => {
    const res = await buildApp().request('/contratos/123456-7')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      numero: '123456-7', saldoAtual: 9245.5,
      proximaParcela: { vencimento: '2026-07-10', valor: 944.3 },
    })
  })

  it('não revela contratos que não pertencem ao usuário ou não existem', async () => {
    const res = await buildApp().request('/contratos/999999-9')
    expect(res.status).toBe(404)
  })
})
