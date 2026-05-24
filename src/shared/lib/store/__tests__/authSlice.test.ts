import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authSlice, login, logout } from '../authSlice'

vi.mock('@/shared/auth/tokenStorage', () => ({
  tokenStorage: { set: vi.fn(), clear: vi.fn(), get: vi.fn() },
}))

// { sub: 'user1', exp: 9999999999, iat: 1700000000 }
const TOKEN =
  'eyJhbGciOiJSUzI1NiJ9' +
  '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ' +
  '.signature'

const { reducer } = authSlice

describe('authSlice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('estado inicial não autenticado', () => {
    const state = reducer(undefined, { type: '@@INIT' })
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('login: seta token, user e isAuthenticated=true', () => {
    const state = reducer(undefined, login({ token: TOKEN }))
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe(TOKEN)
    expect(state.user?.sub).toBe('user1')
  })

  it('logout: limpa estado completamente', () => {
    const authed = reducer(undefined, login({ token: TOKEN }))
    const state = reducer(authed, logout())
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })
})
