import { beforeEach, describe, it, expect } from 'vitest'
import { emprestimoHandlers, resetEmprestimoMemoria } from '../emprestimo'

function handler(path: string) {
  return emprestimoHandlers.find((item) => item.info.path === path)!
}

async function runHandler(path: string, request: Request, requestId: string) {
  const res = await handler(path).run({
    request,
    requestId,
    resolutionContext: { baseUrl: 'http://api' },
  } as never)
  return (res!.response as Response).json()
}

describe('handlers de empréstimo', () => {
  beforeEach(() => {
    resetEmprestimoMemoria()
  })

  it('cobrem os endpoints de contratos, simulação e termos', () => {
    const rotas = emprestimoHandlers.map((h) => h.info.path)
    expect(rotas).toContain('/emprestimo.svc/contratos')
    expect(rotas).toContain('/emprestimo.svc/MultiplasSimulacoes')
    expect(rotas).toContain('/emprestimo.svc/propostas/object')
  })

  it('GET /emprestimo.svc/contratos responde 200 com a fixture', async () => {
    // MSW 2.14: handler.run() requer requestId e resolutionContext.baseUrl
    // para que matchRequestUrl resolva caminhos relativos corretamente.
    const body = await runHandler(
      '/emprestimo.svc/contratos',
      new Request('http://api/emprestimo.svc/contratos'),
      'test-req-1',
    )
    expect(Array.isArray(body)).toBe(true)
    expect((body as Array<{ Contrato: string }>).at(0)?.Contrato).toBe('123456-7')
  })

  it('salva propostas em memória entre POST e GET', async () => {
    const result = await runHandler(
      '/emprestimo.svc/propostas/object',
      new Request('http://api/emprestimo.svc/propostas/object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ValorLiquido: 9000,
          NumeroParcelas: 18,
          LinhaCredito: 205,
          DataLiberacao: '2026-06-30',
        }),
      }),
      'test-req-2',
    )

    const propostas = await runHandler(
      '/emprestimo.svc/propostas',
      new Request('http://api/emprestimo.svc/propostas'),
      'test-req-3',
    )

    expect(result).toEqual({ numeroDoContrato: 'PRP-2026-0102' })
    expect(propostas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Contrato: 'PRP-2026-0102',
          ValorLiquido: 9000,
          NumeroDeParcelas: 18,
          StatusDaProposta: { Key: 'P', Value: 'Pendente' },
        }),
      ]),
    )
  })

  it('remove propostas da memória no DELETE', async () => {
    await runHandler(
      '/emprestimo.svc/propostas/object',
      new Request('http://api/emprestimo.svc/propostas/object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ValorLiquido: 9000,
          NumeroParcelas: 18,
          LinhaCredito: 205,
          DataLiberacao: '2026-06-30',
        }),
      }),
      'test-req-4',
    )

    const removido = await runHandler(
      '/emprestimo.svc/propostas/:id',
      new Request('http://api/emprestimo.svc/propostas/PRP-2026-0102', { method: 'DELETE' }),
      'test-req-5',
    )
    const propostas = await runHandler(
      '/emprestimo.svc/propostas',
      new Request('http://api/emprestimo.svc/propostas'),
      'test-req-6',
    )

    expect(removido).toBe(true)
    expect(propostas).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Contrato: 'PRP-2026-0102' }),
      ]),
    )
  })
})
