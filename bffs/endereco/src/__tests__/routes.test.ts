import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.ts'

describe('rotas de endereco', () => {
  it('GET /usuario/endereco retorna o endereço simulado', async () => {
    const res = await request(createApp()).get('/usuario/endereco')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
    })
  })

  it('PUT /usuario/endereco ecoa o corpo enviado', async () => {
    const novoEndereco = { cep: '04567000', logradouro: 'Av. Paulista', numero: '1000' }

    const res = await request(createApp())
      .put('/usuario/endereco')
      .send(novoEndereco)

    expect(res.status).toBe(200)
    expect(res.body).toEqual(novoEndereco)
  })
})
