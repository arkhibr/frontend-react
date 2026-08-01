// src/shared/auth/tokenParser.bench.ts
// Micro-benchmarks do parsing/expiração de JWT no caminho quente de auth.
// Rode com: npm run bench (na raiz). Ver ADR-005.
import { bench, describe } from 'vitest'
import { parseToken, isTokenExpired } from './tokenParser'

/** Monta um JWT sintético (só o payload importa para o parser). */
function makeToken(exp: number): string {
  const payload = { sub: 'user-1', exp, iat: 1_600_000_000, roles: ['user'] }
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${b64}.signature`
}

const VALID = makeToken(4_102_444_800) // ~ano 2100
const EXPIRED = makeToken(1_000_000_000) // ~ano 2001
const MALFORMED = 'nao-e-um-jwt'

describe('parseToken', () => {
  bench('token bem-formado', () => {
    parseToken(VALID)
  })
})

describe('isTokenExpired', () => {
  bench('token válido', () => {
    isTokenExpired(VALID)
  })
  bench('token expirado', () => {
    isTokenExpired(EXPIRED)
  })
  bench('token malformado (catch)', () => {
    isTokenExpired(MALFORMED)
  })
})
