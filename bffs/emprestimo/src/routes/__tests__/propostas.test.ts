import { beforeEach, describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { createPropostasRouter } from '../propostas.ts'
import { resetPropostasEmMemoria } from '../../legacyBackend.ts'
import type { BffEnv } from '../../types.ts'

beforeEach(() => resetPropostasEmMemoria())

function buildApp() {
  const app = new Hono<BffEnv>()
  app.use(async (c, next) => {
    c.set('auth', { sub: 'user1', roles: [] })
    await next()
  })
  app.route('/', createPropostasRouter())
  return app
}

describe('rotas de propostas', () => {
  it('GET /propostas retorna a lista em camelCase', async () => {
    const res = await buildApp().request('/propostas')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{
      numero: 'PRP-2026-0001', linhaDeCredito: 'Refinanciamento Consignado', taxaDeJuros: 1.39,
      dataDeEmissao: '2026-06-20T10:15:00', valorBruto: 12000, valorLiquido: 10850,
      parcelas: 24, status: 'Pendente',
    }])
  })

  it('DELETE /propostas/:id remove a proposta e retorna true; false se não existir', async () => {
    const app = buildApp()
    const res1 = await app.request('/propostas/PRP-2026-0001', { method: 'DELETE' })
    expect(res1.status).toBe(204)

    const res2 = await app.request('/propostas/PRP-2026-0001', { method: 'DELETE' })
    expect(res2.status).toBe(404)
  })

  it('POST /propostas cria a proposta a partir do corpo em camelCase', async () => {
    const app = buildApp()
    const res = await app.request('/propostas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valorLiquido: 10000, numeroParcelas: 24, linhaCredito: 205, dataLiberacao: '2026-06-30' }),
    })

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ numeroDoContrato: 'PRP-2026-0102' })

    const lista = await app.request('/propostas')
    const listaBody = await lista.json()
    expect(listaBody).toHaveLength(2)
    expect(listaBody[0]).toMatchObject({ numero: 'PRP-2026-0102', valorBruto: 10800 })
  })

  it('rejeita proposta sem dados obrigatórios ou fora da faixa de crédito', async () => {
    const app = buildApp()
    const res1 = await app.request('/propostas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res1.status).toBe(400)

    const res2 = await app.request('/propostas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valorLiquido: 1, numeroParcelas: 24, linhaCredito: 205 }),
    })
    expect(res2.status).toBe(400)
  })
})
