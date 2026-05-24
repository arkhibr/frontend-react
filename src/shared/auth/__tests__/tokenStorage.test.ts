// src/shared/auth/__tests__/tokenStorage.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { tokenStorage } from '../tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => sessionStorage.clear())

  it('retorna null quando não há token armazenado', () => {
    expect(tokenStorage.get()).toBeNull()
  })

  it('armazena e recupera token', () => {
    tokenStorage.set('meu-token-jwt')
    expect(tokenStorage.get()).toBe('meu-token-jwt')
  })

  it('remove token ao chamar clear', () => {
    tokenStorage.set('meu-token-jwt')
    tokenStorage.clear()
    expect(tokenStorage.get()).toBeNull()
  })

  it('sobrescreve token existente ao chamar set novamente', () => {
    tokenStorage.set('token-antigo')
    tokenStorage.set('token-novo')
    expect(tokenStorage.get()).toBe('token-novo')
  })
})
