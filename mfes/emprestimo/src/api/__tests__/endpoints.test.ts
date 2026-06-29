import { describe, it, expect, vi, afterEach } from 'vitest'
import { createApi } from '../endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

function jsonFetch(data: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(data)))
}

describe('endpoints', () => {
  it('listarContratos faz GET em /emprestimo.svc/contratos', async () => {
    const fetchMock = jsonFetch([{ Contrato: '1' }])
    vi.stubGlobal('fetch', fetchMock)
    const api = createApi(ctx)
    const res = await api.listarContratos()
    expect(fetchMock).toHaveBeenCalledWith('http://api/emprestimo.svc/contratos', expect.any(Object))
    expect(res[0].Contrato).toBe('1')
  })

  it('simularMultiplas faz POST com body em /emprestimo.svc/MultiplasSimulacoes', async () => {
    vi.stubGlobal('fetch', jsonFetch({ PrevisoesDeParcelas: [] }))
    const api = createApi(ctx)
    await api.simularMultiplas({ LinhaDeCredito: 205 } as never)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://api/emprestimo.svc/MultiplasSimulacoes',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('obterContrato faz GET em /emprestimo.svc/contratos/:id', async () => {
    vi.stubGlobal('fetch', jsonFetch({ Contrato: '001-A' }))
    const api = createApi(ctx)
    await api.obterContrato('001-A')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/contratos/001-A'), expect.any(Object))
  })

  it('listarPropostas faz GET em /emprestimo.svc/propostas', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.listarPropostas()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/propostas'), expect.any(Object))
  })

  it('excluirProposta faz DELETE em /emprestimo.svc/propostas/:id', async () => {
    vi.stubGlobal('fetch', jsonFetch(true))
    const api = createApi(ctx)
    await api.excluirProposta('PRP-99')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/propostas/PRP-99'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('obterExtrato faz GET com datas', async () => {
    vi.stubGlobal('fetch', jsonFetch({ MovimentoDeEmprestimo: [] }))
    const api = createApi(ctx)
    await api.obterExtrato('001-A', '2026-05-01', '2026-06-01')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('001-A'), expect.any(Object))
  })

  it('obterParametrosSimulacao faz GET em /emprestimo.svc/simulacao', async () => {
    vi.stubGlobal('fetch', jsonFetch({ LinhasDeEmprestimo: [] }))
    const api = createApi(ctx)
    await api.obterParametrosSimulacao()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/simulacao'), expect.any(Object))
  })

  it('enviarProposta faz POST em /emprestimo.svc/propostas/object', async () => {
    vi.stubGlobal('fetch', jsonFetch({ numeroDoContrato: 'CTR-100' }))
    const api = createApi(ctx)
    const result = await api.enviarProposta({ ValorLiquido: 10000, NumeroParcelas: 24, LinhaCredito: 205 } as never)
    expect(result.numeroDoContrato).toBe('CTR-100')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('propostas/object'), expect.objectContaining({ method: 'POST' }))
  })

  it('assinarTermo faz POST em /TermoDeAceite.svc/AssinarTermoDeAceite', async () => {
    vi.stubGlobal('fetch', jsonFetch(true))
    const api = createApi(ctx)
    await api.assinarTermo({ TipoDoTermoDeAceite: 'PROPOSTA_WEB', SistemaDeOrigem: 'WEB' })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('AssinarTermoDeAceite'), expect.objectContaining({ method: 'POST' }))
  })
})
