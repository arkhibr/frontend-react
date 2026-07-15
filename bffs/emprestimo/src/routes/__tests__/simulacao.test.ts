import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createSimulacaoRouter } from '../simulacao.ts'
import type { BffEnv } from '../../types.ts'

function buildApp() {
  const app = new Hono<BffEnv>()
  app.use(async (c, next) => {
    c.set('auth', { sub: 'user1', roles: [] })
    await next()
  })
  app.route('/', createSimulacaoRouter())
  return app
}

describe('rotas de simulação', () => {
  it('GET /simulacao/parametros retorna as linhas de crédito em camelCase', async () => {
    const res = await buildApp().request('/simulacao/parametros')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{
      id: 205, descricao: 'Refinanciamento Consignado', numeroMinimoDeParcelas: 12, numeroMaximoDeParcelas: 48,
      valorMinimo: 3000, valorMaximo: 50000, percentualTaxaJuros: 1.39, creditoTrabalhador: true,
    }])
  })

  it('rejeita simulação fora das condições de crédito', async () => {
    const res = await buildApp().request('/simulacao/multiplas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linhaDeCredito: 205, valorLiquido: 1, numeroDeParcelas: [24] }),
    })
    expect(res.status).toBe(400)
  })

  it('GET /simulacao/primeiro-vencimento retorna o resultado em camelCase', async () => {
    const res = await buildApp().request('/simulacao/primeiro-vencimento?cl=205&tv=2&dv=5&dl=1&dr=1')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dataDeVencimentoInicial).toBe('2026-08-05')
    expect(body.contratosAptosAoRefinanciamento).toHaveLength(1)
  })

  it('POST /simulacao/multiplas retorna os cenários em camelCase', async () => {
    const res = await buildApp().request('/simulacao/multiplas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linhaDeCredito: 205, valorLiquido: 10000, numeroDeParcelas: [24] }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ parcelas: 24, valorBruto: 11250, valorLiquido: 10000, cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480 }])
  })
})
