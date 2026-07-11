import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createSimulacaoRouter } from '../simulacao.ts'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => { res.locals.auth = { sub: 'user1', roles: [] }; next() })
  app.use(createSimulacaoRouter())
  return app
}

describe('rotas de simulação', () => {
  it('GET /simulacao/parametros retorna as linhas de crédito em camelCase', async () => {
    const res = await request(buildApp()).get('/simulacao/parametros')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      id: 205, descricao: 'Refinanciamento Consignado', numeroMinimoDeParcelas: 12, numeroMaximoDeParcelas: 48,
      valorMinimo: 3000, valorMaximo: 50000, percentualTaxaJuros: 1.39, creditoTrabalhador: true,
    }])
  })

  it('rejeita simulação fora das condições de crédito', async () => {
    const res = await request(buildApp()).post('/simulacao/multiplas').send({
      linhaDeCredito: 205, valorLiquido: 1, numeroDeParcelas: [24],
    })
    expect(res.status).toBe(400)
  })

  it('GET /simulacao/primeiro-vencimento retorna o resultado em camelCase', async () => {
    const res = await request(buildApp()).get('/simulacao/primeiro-vencimento?cl=205&tv=2&dv=5&dl=1&dr=1')

    expect(res.status).toBe(200)
    expect(res.body.dataDeVencimentoInicial).toBe('2026-08-05')
    expect(res.body.contratosAptosAoRefinanciamento).toHaveLength(1)
  })

  it('POST /simulacao/multiplas retorna os cenários em camelCase', async () => {
    const res = await request(buildApp()).post('/simulacao/multiplas').send({
      linhaDeCredito: 205, valorLiquido: 10000, numeroDeParcelas: [24],
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ parcelas: 24, valorBruto: 11250, valorLiquido: 10000, cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480 }])
  })
})
