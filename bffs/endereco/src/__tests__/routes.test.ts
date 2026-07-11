import { describe, it, expect } from 'vitest'
import request, { type Test } from 'supertest'
import { createApp } from '../app.ts'

const key = 'test-gateway-key'
function authenticated(app: ReturnType<typeof createApp>) {
  const headers = (test: Test) => test
    .set('X-Internal-Gateway-Key', key)
    .set('X-Authenticated-Subject', 'user1')
  return {
    get: (path: string) => headers(request(app).get(path)),
    put: (path: string) => headers(request(app).put(path)),
  }
}

describe('rotas de endereco', () => {
  it('GET /usuario/endereco retorna o endereço simulado', async () => {
    const res = await authenticated(createApp({ internalGatewayKey: key })).get('/usuario/endereco')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
    })
  })

  it('PUT /usuario/endereco ecoa o corpo enviado', async () => {
    const novoEndereco = { cep: '04567000', logradouro: 'Av. Paulista', numero: '1000' }

    const res = await authenticated(createApp({ internalGatewayKey: key }))
      .put('/usuario/endereco')
      .send(novoEndereco)

    expect(res.status).toBe(200)
    expect(res.body).toEqual(novoEndereco)
  })

  it('rejeita acesso direto, payloads extras e CEP inválido', async () => {
    const app = createApp({ internalGatewayKey: key })
    await request(app).get('/usuario/endereco').expect(401)
    await authenticated(app).put('/usuario/endereco').send({ cep: 'invalido', logradouro: 'Rua A', numero: '1' }).expect(400)
    await authenticated(app).put('/usuario/endereco').send({ cep: '04567000', logradouro: 'Rua A', numero: '1', admin: true }).expect(400)
  })
})
