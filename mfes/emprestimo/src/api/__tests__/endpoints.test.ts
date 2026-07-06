import { describe, it, expect, vi, afterEach } from 'vitest'
import { createApi } from '../endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

function jsonFetch(data: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(data)))
}

describe('endpoints', () => {
  it('listarContratos faz GET em /contratos', async () => {
    const fetchMock = jsonFetch([{ numero: '1' }])
    vi.stubGlobal('fetch', fetchMock)
    const api = createApi(ctx)
    const res = await api.listarContratos()
    expect(fetchMock).toHaveBeenCalledWith('http://api/contratos', expect.any(Object))
    expect(res[0].numero).toBe('1')
  })

  it('simularMultiplas faz POST com body em /simulacao/multiplas', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.simularMultiplas({ linhaDeCredito: 205, valorLiquido: 10000, numeroDeParcelas: [24] })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://api/simulacao/multiplas',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('obterContrato faz GET em /contratos/:id', async () => {
    vi.stubGlobal('fetch', jsonFetch({ numero: '001-A' }))
    const api = createApi(ctx)
    await api.obterContrato('001-A')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/contratos/001-A'), expect.any(Object))
  })

  it('listarPropostas faz GET em /propostas', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.listarPropostas()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/propostas'), expect.any(Object))
  })

  it('excluirProposta faz DELETE em /propostas/:id', async () => {
    vi.stubGlobal('fetch', jsonFetch(true))
    const api = createApi(ctx)
    await api.excluirProposta('PRP-99')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/propostas/PRP-99'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('obterExtrato faz GET com datas na querystring', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.obterExtrato('001-A', '2026-05-01', '2026-06-01')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/contratos/001-A/extrato?inicio=2026-05-01&fim=2026-06-01'),
      expect.any(Object),
    )
  })

  it('obterParametrosSimulacao faz GET em /simulacao/parametros', async () => {
    vi.stubGlobal('fetch', jsonFetch([]))
    const api = createApi(ctx)
    await api.obterParametrosSimulacao()
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/simulacao/parametros'), expect.any(Object))
  })

  it('enviarProposta faz POST em /propostas', async () => {
    vi.stubGlobal('fetch', jsonFetch({ numeroDoContrato: 'CTR-100' }))
    const api = createApi(ctx)
    const result = await api.enviarProposta({ valorLiquido: 10000, numeroParcelas: 24, linhaCredito: 205 })
    expect(result.numeroDoContrato).toBe('CTR-100')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('http://api/propostas', expect.objectContaining({ method: 'POST' }))
  })

  it('assinarTermo faz POST em /termos/assinar', async () => {
    vi.stubGlobal('fetch', jsonFetch(true))
    const api = createApi(ctx)
    await api.assinarTermo({ tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB' })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('/termos/assinar'), expect.objectContaining({ method: 'POST' }))
  })
})
