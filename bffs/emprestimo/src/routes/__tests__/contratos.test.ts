import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createContratosRouter } from '../contratos.ts'

function buildApp() {
  const app = express()
  app.use(createContratosRouter())
  return app
}

describe('rotas de contratos', () => {
  it('GET /contratos retorna a lista em camelCase', async () => {
    const res = await request(buildApp()).get('/contratos')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ numero: '123456-7', linhaDeCredito: 'Crédito Pessoal', saldoAtual: 9245.5 })
    expect(res.body[0].CodigoDaLinha).toBeUndefined()
    expect(res.body[1]).toMatchObject({ numero: '654321-0', temAtraso: true })
  })

  it('GET /contratos/:id retorna o detalhe em camelCase, independente do id', async () => {
    const res = await request(buildApp()).get('/contratos/qualquer-id')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      numero: '123456-7', saldoAtual: 9245.5,
      proximaParcela: { vencimento: '2026-07-10', valor: 944.3 },
    })
  })
})
