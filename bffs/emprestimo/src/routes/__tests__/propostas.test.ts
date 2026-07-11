import { beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createPropostasRouter } from '../propostas.ts'
import { resetPropostasEmMemoria } from '../../legacyBackend.ts'

beforeEach(() => resetPropostasEmMemoria())

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => { res.locals.auth = { sub: 'user1', roles: [] }; next() })
  app.use(createPropostasRouter())
  return app
}

describe('rotas de propostas', () => {
  it('GET /propostas retorna a lista em camelCase', async () => {
    const res = await request(buildApp()).get('/propostas')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      numero: 'PRP-2026-0001', linhaDeCredito: 'Refinanciamento Consignado', taxaDeJuros: 1.39,
      dataDeEmissao: '2026-06-20T10:15:00', valorBruto: 12000, valorLiquido: 10850,
      parcelas: 24, status: 'Pendente',
    }])
  })

  it('DELETE /propostas/:id remove a proposta e retorna true; false se não existir', async () => {
    const app = buildApp()
    const res1 = await request(app).delete('/propostas/PRP-2026-0001')
    expect(res1.status).toBe(204)

    const res2 = await request(app).delete('/propostas/PRP-2026-0001')
    expect(res2.status).toBe(404)
  })

  it('POST /propostas cria a proposta a partir do corpo em camelCase', async () => {
    const app = buildApp()
    const res = await request(app).post('/propostas').send({
      valorLiquido: 10000, numeroParcelas: 24, linhaCredito: 205, dataLiberacao: '2026-06-30',
    })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ numeroDoContrato: 'PRP-2026-0102' })

    const lista = await request(app).get('/propostas')
    expect(lista.body).toHaveLength(2)
    expect(lista.body[0]).toMatchObject({ numero: 'PRP-2026-0102', valorBruto: 10800 })
  })

  it('rejeita proposta sem dados obrigatórios ou fora da faixa de crédito', async () => {
    const app = buildApp()
    await request(app).post('/propostas').send({}).expect(400)
    await request(app).post('/propostas').send({ valorLiquido: 1, numeroParcelas: 24, linhaCredito: 205 }).expect(400)
  })
})
