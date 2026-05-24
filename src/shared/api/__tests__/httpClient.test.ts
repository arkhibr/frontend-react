import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '../types'

// Mock tokenStorage BEFORE importing httpClient
vi.mock('@/shared/auth/tokenStorage', () => ({
  tokenStorage: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
}))

import { httpClient } from '../httpClient'
import { tokenStorage } from '@/shared/auth/tokenStorage'

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

describe('httpClient', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('injeta Authorization header quando token existe', async () => {
    vi.mocked(tokenStorage.get).mockReturnValue('meu-token')
    mockFetch(200, { ok: true })

    await httpClient('/endpoint')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/endpoint'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer meu-token',
        }),
      }),
    )
  })

  it('não injeta Authorization quando não há token', async () => {
    vi.mocked(tokenStorage.get).mockReturnValue(null)
    mockFetch(200, {})

    await httpClient('/endpoint')

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0]!
    const headers = (options as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })

  it('retorna corpo deserializado em caso de sucesso', async () => {
    vi.mocked(tokenStorage.get).mockReturnValue(null)
    mockFetch(200, { id: 1, nome: 'Teste' })

    const result = await httpClient<{ id: number; nome: string }>('/endpoint')
    expect(result).toEqual({ id: 1, nome: 'Teste' })
  })

  it('lança ApiError com status correto em caso de erro HTTP', async () => {
    vi.mocked(tokenStorage.get).mockReturnValue(null)
    mockFetch(404, { message: 'Not found' })

    await expect(httpClient('/endpoint')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('dispara evento auth:unauthorized e lança ApiError em resposta 401', async () => {
    vi.mocked(tokenStorage.get).mockReturnValue('token-expirado')
    mockFetch(401, {})

    const listener = vi.fn()
    window.addEventListener('auth:unauthorized', listener)

    await expect(httpClient('/endpoint')).rejects.toBeInstanceOf(ApiError)
    expect(listener).toHaveBeenCalledOnce()
    expect(tokenStorage.clear).toHaveBeenCalled()

    window.removeEventListener('auth:unauthorized', listener)
  })
})
