import { describe, it, expect } from 'vitest'
import { createApp } from '../app.ts'

const key = 'test-gateway-key'

function authenticated(app: ReturnType<typeof createApp>, method: 'GET' | 'PUT', path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: {
      'X-Internal-Gateway-Key': key,
      'X-Authenticated-Subject': 'user1',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('rotas de endereco', () => {
  it('GET /usuario/endereco retorna o endereço simulado', async () => {
    const res = await authenticated(createApp({ internalGatewayKey: key }), 'GET', '/usuario/endereco')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
    })
  })

  it('PUT /usuario/endereco ecoa o corpo enviado', async () => {
    const novoEndereco = { cep: '04567000', logradouro: 'Av. Paulista', numero: '1000' }

    const res = await authenticated(createApp({ internalGatewayKey: key }), 'PUT', '/usuario/endereco', novoEndereco)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(novoEndereco)
  })

  it('rejeita acesso direto, payloads extras e CEP inválido', async () => {
    const app = createApp({ internalGatewayKey: key })

    const semAuth = await app.request('/usuario/endereco')
    expect(semAuth.status).toBe(401)

    const cepInvalido = await authenticated(app, 'PUT', '/usuario/endereco', { cep: 'invalido', logradouro: 'Rua A', numero: '1' })
    expect(cepInvalido.status).toBe(400)

    const campoExtra = await authenticated(app, 'PUT', '/usuario/endereco', { cep: '04567000', logradouro: 'Rua A', numero: '1', admin: true })
    expect(campoExtra.status).toBe(400)
  })
})
