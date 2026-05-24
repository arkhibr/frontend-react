// src/shared/lib/validators/__tests__/cpf.test.ts
import { describe, it, expect } from 'vitest'
import { isValidCPF } from '../cpf'

describe('isValidCPF', () => {
  it('aceita CPF válido com formatação', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
  })

  it('aceita CPF válido sem formatação', () => {
    expect(isValidCPF('52998224725')).toBe(true)
  })

  it.each([
    '111.111.111-11',
    '000.000.000-00',
    '999.999.999-99',
  ])('rejeita CPF com dígitos repetidos: %s', (cpf) => {
    expect(isValidCPF(cpf)).toBe(false)
  })

  it('rejeita CPF com dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false)
  })

  it('rejeita CPF com menos de 11 dígitos', () => {
    expect(isValidCPF('123.456.789')).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(isValidCPF('')).toBe(false)
  })
})
