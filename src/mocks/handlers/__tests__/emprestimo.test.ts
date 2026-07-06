import { beforeEach, describe, it, expect } from 'vitest'
import { emprestimoHandlers, resetEmprestimoMemoria } from '../emprestimo'

function handler(path: string, method: string) {
  return emprestimoHandlers.find(
    (item) => item.info.path === path && item.info.method === method,
  )!
}

async function runHandler(path: string, request: Request, requestId: string) {
  const res = await handler(path, request.method).run({
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
    expect(rotas).toContain('/contratos')
    expect(rotas).toContain('/simulacao/multiplas')
    expect(rotas).toContain('/propostas')
    expect(rotas).toContain('/termos/:tipo')
  })

  it('GET /contratos responde 200 com a fixture no formato limpo', async () => {
    // MSW 2.14: handler.run() requer requestId e resolutionContext.baseUrl
    // para que matchRequestUrl resolva caminhos relativos corretamente.
    const body = await runHandler(
      '/contratos',
      new Request('http://api/contratos'),
      'test-req-1',
    )
    expect(Array.isArray(body)).toBe(true)
    expect((body as Array<{ numero: string }>).at(0)?.numero).toBe('123456-7')
  })

  it('GET /contratos/:id responde com o detalhe do contrato no formato limpo', async () => {
    const body = await runHandler(
      '/contratos/:id',
      new Request('http://api/contratos/123456-7'),
      'test-req-detalhe',
    ) as { numero: string; linhaDeCredito: string; proximaParcela: { vencimento: string; valor: number } | null }

    expect(body.numero).toBe('123456-7')
    expect(body.linhaDeCredito).toBe('Crédito Pessoal')
    expect(body.proximaParcela).toEqual({ vencimento: '2026-07-10', valor: 944.3 })
  })

  it('GET /contratos/:id/extrato retorna os movimentos em camelCase', async () => {
    const body = await runHandler(
      '/contratos/:id/extrato',
      new Request('http://api/contratos/123456-7/extrato?inicio=2026-05-30&fim=2026-06-29'),
      'test-req-extrato',
    ) as Array<{ tipo: string; valor: number }>

    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ tipo: 'Debito', valor: 944.3 })
  })

  it('GET /simulacao/parametros retorna as linhas de crédito em camelCase', async () => {
    const body = await runHandler(
      '/simulacao/parametros',
      new Request('http://api/simulacao/parametros'),
      'test-req-parametros',
    ) as Array<{ id: number; descricao: string }>

    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ id: 205, descricao: 'Refinanciamento Consignado' })
  })

  it('GET /termos/:tipo retorna o termo correspondente ao tipo pedido', async () => {
    const propostaWeb = await runHandler(
      '/termos/:tipo',
      new Request('http://api/termos/PropostaWeb'),
      'test-req-termo-1',
    ) as { tipoDoTermo: string }
    expect(propostaWeb.tipoDoTermo).toBe('PROPOSTA_WEB')

    const dadosCadastrais = await runHandler(
      '/termos/:tipo',
      new Request('http://api/termos/CONSENTIMENTO_DADOS_CADASTRAIS'),
      'test-req-termo-2',
    ) as { tipoDoTermo: string }
    expect(dadosCadastrais.tipoDoTermo).toBe('CONSENTIMENTO_DADOS_CADASTRAIS')
  })

  it('salva propostas em memória entre POST e GET', async () => {
    const result = await runHandler(
      '/propostas',
      new Request('http://api/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valorLiquido: 9000,
          numeroParcelas: 18,
          linhaCredito: 205,
          dataLiberacao: '2026-06-30',
        }),
      }),
      'test-req-2',
    )

    const propostas = await runHandler(
      '/propostas',
      new Request('http://api/propostas'),
      'test-req-3',
    )

    expect(result).toEqual({ numeroDoContrato: 'PRP-2026-0102' })
    expect(propostas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          numero: 'PRP-2026-0102',
          valorLiquido: 9000,
          valorBruto: 9720,
          parcelas: 18,
          status: 'Pendente',
        }),
      ]),
    )
  })

  it('remove propostas da memória no DELETE', async () => {
    await runHandler(
      '/propostas',
      new Request('http://api/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valorLiquido: 9000,
          numeroParcelas: 18,
          linhaCredito: 205,
          dataLiberacao: '2026-06-30',
        }),
      }),
      'test-req-4',
    )

    const removido = await runHandler(
      '/propostas/:id',
      new Request('http://api/propostas/PRP-2026-0102', { method: 'DELETE' }),
      'test-req-5',
    )
    const propostas = await runHandler(
      '/propostas',
      new Request('http://api/propostas'),
      'test-req-6',
    )

    expect(removido).toBe(true)
    expect(propostas).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ numero: 'PRP-2026-0102' }),
      ]),
    )
  })
})
