import { describe, it, expect, vi, afterEach } from 'vitest'
import { createApi } from '../endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

describe('endpoints', () => {
  it('listarContratos faz GET em /emprestimo.svc/contratos', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ Contrato: '1' }])))
    vi.stubGlobal('fetch', fetchMock)
    const api = createApi(ctx)
    const res = await api.listarContratos()
    expect(fetchMock).toHaveBeenCalledWith('http://api/emprestimo.svc/contratos', expect.any(Object))
    expect(res[0].Contrato).toBe('1')
  })

  it('simularMultiplas faz POST com body em /emprestimo.svc/MultiplasSimulacoes', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ PrevisoesDeParcelas: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const api = createApi(ctx)
    await api.simularMultiplas({ LinhaDeCredito: 205 } as never)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api/emprestimo.svc/MultiplasSimulacoes',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
