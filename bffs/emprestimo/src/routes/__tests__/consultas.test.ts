import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createConsultasRouter } from '../consultas.ts'
import type { BffEnv } from '../../types.ts'

function buildApp() {
  const app = new Hono<BffEnv>()
  app.use(async (c, next) => {
    c.set('auth', { sub: 'user1', roles: [] })
    await next()
  })
  app.route('/', createConsultasRouter())
  return app
}

describe('rotas de consultas', () => {
  it('GET /contratos/:id/extrato retorna os movimentos em camelCase', async () => {
    const res = await buildApp().request('/contratos/123456-7/extrato?inicio=2026-05-30&fim=2026-06-29')

    expect(res.status).toBe(200)
    const body = (await res.json()) as any[]
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({ tipo: 'Debito', data: '2026-06-10', historico: 'Prestação mensal', valor: 944.3, saldo: 10189.8 })
  })

  it('GET /contratos/:id/previsao retorna as parcelas previstas em camelCase', async () => {
    const res = await buildApp().request('/contratos/123456-7/previsao')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ numero: 11, vencimento: '2026-07-10', prestacao: 944.3, saldoAtual: 9245.5 }])
  })

  it('GET /contratos/:id/parcelas retorna o detalhamento em camelCase', async () => {
    const res = await buildApp().request('/contratos/123456-7/parcelas')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ numero: 10, vencimento: '2026-06-10', prestacao: 944.3, status: 'Quitada' }])
  })

  it('GET /contratos/:id/atraso retorna as parcelas em atraso em camelCase', async () => {
    const res = await buildApp().request('/contratos/654321-0/atraso')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ contrato: '654321-0', vencimento: '2026-05-05', valorPrestacao: 615.8, saldoAtual: 4320.12, proximoVencimento: '2026-07-05' }])
  })
})
