// src/shared/lib/validators/__tests__/email.test.ts
import { describe, it, expect } from 'vitest'
import { isValidEmail } from '../email'

describe('isValidEmail', () => {
  it.each([
    'usuario@empresa.com',
    'nome.sobrenome@dominio.com.br',
    'user+tag@example.org',
  ])('aceita email válido: %s', (email) => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each([
    'sem-arroba',
    '@sem-usuario.com',
    'sem-dominio@',
    '',
    'espaco @email.com',
    'dois@@at.com',
  ])('rejeita email inválido: %s', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })
})
