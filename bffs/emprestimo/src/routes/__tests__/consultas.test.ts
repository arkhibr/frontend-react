import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createConsultasRouter } from '../consultas.ts'

function buildApp() {
  const app = express()
  app.use((_req, res, next) => { res.locals.auth = { sub: 'user1', roles: [] }; next() })
  app.use(createConsultasRouter())
  return app
}

describe('rotas de consultas', () => {
  it('GET /contratos/:id/extrato retorna os movimentos em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/123456-7/extrato?inicio=2026-05-30&fim=2026-06-29')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toEqual({ tipo: 'Debito', data: '2026-06-10', historico: 'Prestação mensal', valor: 944.3, saldo: 10189.8 })
  })

  it('GET /contratos/:id/previsao retorna as parcelas previstas em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/123456-7/previsao')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ numero: 11, vencimento: '2026-07-10', prestacao: 944.3, saldoAtual: 9245.5 }])
  })

  it('GET /contratos/:id/parcelas retorna o detalhamento em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/123456-7/parcelas')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ numero: 10, vencimento: '2026-06-10', prestacao: 944.3, status: 'Quitada' }])
  })

  it('GET /contratos/:id/atraso retorna as parcelas em atraso em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos/654321-0/atraso')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ contrato: '654321-0', vencimento: '2026-05-05', valorPrestacao: 615.8, saldoAtual: 4320.12, proximoVencimento: '2026-07-05' }])
  })
})
