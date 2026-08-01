import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHttpClient } from '../httpClient'

afterEach(() => vi.restoreAllMocks())

describe('createHttpClient', () => {
  it('injeta Bearer token, base url e prefixo /bff/endereco quando apiUrl está definido', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal('fetch', fetchMock)
    const client = createHttpClient({ apiUrl: 'http://api', token: 't1', onUnauthorized: () => {} })
    await client('/enderecos')
    expect(fetchMock).toHaveBeenCalledWith('http://api/bff/endereco/enderecos', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer t1' }),
    }))
  })

  it('não adiciona prefixo quando apiUrl está vazio (modo MSW)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal('fetch', fetchMock)
    const client = createHttpClient({ apiUrl: '', token: null, onUnauthorized: () => {} })
    await client('/enderecos')
    expect(fetchMock).toHaveBeenCalledWith('/enderecos', expect.anything())
  })

  it('direciona outro BFF via deps.bff — a relação MFE↔BFF não é 1:1', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal('fetch', fetchMock)
    const client = createHttpClient({ apiUrl: 'http://api', token: 't1', onUnauthorized: () => {}, bff: 'emprestimo' })
    await client('/contratos')
    expect(fetchMock).toHaveBeenCalledWith('http://api/bff/emprestimo/contratos', expect.anything())
  })

  it('chama onUnauthorized em 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))
    const onUnauthorized = vi.fn()
    const client = createHttpClient({ apiUrl: 'http://api', token: 't1', onUnauthorized })
    await expect(client('/enderecos')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
