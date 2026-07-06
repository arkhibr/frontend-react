import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.ts'
import { resetPropostasEmMemoria } from '../legacyBackend.ts'

beforeEach(() => resetPropostasEmMemoria())

describe('createApp', () => {
  it('compõe todas as rotas de domínio num único app', async () => {
    const app = createApp()

    const contratos = await request(app).get('/contratos')
    expect(contratos.status).toBe(200)

    const propostas = await request(app).get('/propostas')
    expect(propostas.status).toBe(200)

    const parametros = await request(app).get('/simulacao/parametros')
    expect(parametros.status).toBe(200)

    const termo = await request(app).get('/termos/PropostaWeb')
    expect(termo.status).toBe(200)
  })
})
