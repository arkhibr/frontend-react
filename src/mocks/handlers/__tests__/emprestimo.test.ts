import { describe, it, expect } from 'vitest'
import { emprestimoHandlers } from '../emprestimo'

describe('handlers de empréstimo', () => {
  it('cobrem os endpoints de contratos, simulação e termos', () => {
    const rotas = emprestimoHandlers.map((h) => h.info.path)
    expect(rotas).toContain('/emprestimo.svc/contratos')
    expect(rotas).toContain('/emprestimo.svc/MultiplasSimulacoes')
    expect(rotas).toContain('/emprestimo.svc/propostas/object')
  })

  it('GET /emprestimo.svc/contratos responde 200 com a fixture', async () => {
    const handler = emprestimoHandlers.find(
      (h) => h.info.path === '/emprestimo.svc/contratos',
    )!
    // MSW 2.14: handler.run() requer requestId e resolutionContext.baseUrl
    // para que matchRequestUrl resolva caminhos relativos corretamente.
    const res = await handler.run({
      request: new Request('http://api/emprestimo.svc/contratos'),
      requestId: 'test-req-1',
      resolutionContext: { baseUrl: 'http://api' },
    } as never)
    const body = await (res!.response as Response).json()
    expect(Array.isArray(body)).toBe(true)
    expect((body as Array<{ Contrato: string }>)[0].Contrato).toBe('123456-7')
  })
})
