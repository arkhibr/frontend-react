import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { resetPropostasEmMemoria } from '../legacyBackend.ts'

beforeEach(() => resetPropostasEmMemoria())

describe('createApp', () => {
  it('compõe todas as rotas de domínio num único app', async () => {
    const app = createApp({ internalGatewayKey: 'test-gateway-key' })
    const authenticated = (path: string) => app.request(path, {
      headers: { 'X-Internal-Gateway-Key': 'test-gateway-key', 'X-Authenticated-Subject': 'user1' },
    })

    const contratos = await authenticated('/contratos')
    expect(contratos.status).toBe(200)

    const propostas = await authenticated('/propostas')
    expect(propostas.status).toBe(200)

    const parametros = await authenticated('/simulacao/parametros')
    expect(parametros.status).toBe(200)

    const termo = await authenticated('/termos/PropostaWeb')
    expect(termo.status).toBe(200)
  })

  it('recusa chamadas diretas sem credencial interna do gateway', async () => {
    const app = createApp({ internalGatewayKey: 'test-gateway-key' })
    const res = await app.request('/contratos')
    expect(res.status).toBe(401)
  })
})
