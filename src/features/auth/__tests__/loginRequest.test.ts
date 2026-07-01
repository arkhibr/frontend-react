import { describe, it, expect, vi, afterEach } from 'vitest'
import { loginRequest } from '../loginRequest'

afterEach(() => vi.restoreAllMocks())

describe('loginRequest', () => {
  it('faz POST em /auth/token e retorna o access_token', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ access_token: 'abc' })))
    vi.stubGlobal('fetch', fetchMock)
    const token = await loginRequest('usuario@teste.com', 'senha123')
    expect(token).toBe('abc')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/\/auth\/token$/)
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init!.body as string)).toEqual({ email: 'usuario@teste.com', senha: 'senha123' })
  })

  it('lança erro quando as credenciais são inválidas (401)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))
    await expect(loginRequest('x@y.com', 'errado')).rejects.toThrow()
  })
})
