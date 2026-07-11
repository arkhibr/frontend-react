// src/shared/auth/__tests__/tokenParser.test.ts
import { describe, it, expect } from 'vitest'
import { parseToken, isTokenExpired } from '../tokenParser'

// Payload: { sub: 'user1', exp: 9999999999, iat: 1700000000 }
const VALID_TOKEN =
  'eyJhbGciOiJSUzI1NiJ9' +
  '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ' +
  '.signature'

// Payload: { sub: 'user1', exp: 1, iat: 1700000000 }
const EXPIRED_TOKEN =
  'eyJhbGciOiJSUzI1NiJ9' +
  '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6MSwiaWF0IjoxNzAwMDAwMDAwfQ' +
  '.signature'

describe('parseToken', () => {
  it('extrai sub e exp do payload', () => {
    const payload = parseToken(VALID_TOKEN)
    expect(payload.sub).toBe('user1')
    expect(payload.exp).toBe(9999999999)
  })

  it('lança erro para token com formato inválido', () => {
    expect(() => parseToken('nao-e-um-jwt')).toThrow('Token JWT inválido')
  })
})

describe('isTokenExpired', () => {
  it('retorna false para token válido', () => {
    expect(isTokenExpired(VALID_TOKEN)).toBe(false)
  })

  it('retorna true para token expirado', () => {
    expect(isTokenExpired(EXPIRED_TOKEN)).toBe(true)
  })

  it('retorna true para token mal-formado', () => {
    expect(isTokenExpired('invalido')).toBe(true)
  })

  it('trata token sem claims obrigatórios como expirado', () => {
    const tokenSemExp = ['header', btoa(JSON.stringify({ sub: 'user1', iat: 1 })), 'signature'].join('.')
    expect(isTokenExpired(tokenSemExp)).toBe(true)
  })
})
