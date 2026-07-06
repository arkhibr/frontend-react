import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHttpClient } from '../httpClient'

afterEach(() => vi.restoreAllMocks())

describe('createHttpClient', () => {
  it('injeta Bearer token, base url e prefixo /bff/emprestimo quando apiUrl está definido', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal('fetch', fetchMock)
    const client = createHttpClient({ apiUrl: 'http://api', token: 't1', onUnauthorized: () => {} })
    await client('/emprestimos')
    expect(fetchMock).toHaveBeenCalledWith('http://api/bff/emprestimo/emprestimos', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer t1' }),
    }))
  })

  it('não adiciona prefixo quando apiUrl está vazio (modo MSW)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal('fetch', fetchMock)
    const client = createHttpClient({ apiUrl: '', token: null, onUnauthorized: () => {} })
    await client('/emprestimos')
    expect(fetchMock).toHaveBeenCalledWith('/emprestimos', expect.anything())
  })

  it('chama onUnauthorized em 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))
    const onUnauthorized = vi.fn()
    const client = createHttpClient({ apiUrl: 'http://api', token: 't1', onUnauthorized })
    await expect(client('/emprestimos')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
