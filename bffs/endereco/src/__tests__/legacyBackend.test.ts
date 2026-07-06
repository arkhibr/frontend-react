import { describe, it, expect } from 'vitest'
import { getEndereco, putEndereco } from '../legacyBackend.ts'

describe('legacyBackend', () => {
  it('getEndereco retorna o endereço fixo simulado', () => {
    expect(getEndereco()).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
    })
  })

  it('putEndereco ecoa o endereço recebido', () => {
    const input = { cep: '04567000', logradouro: 'Av. Paulista', numero: '1000' }
    expect(putEndereco(input)).toEqual(input)
  })
})
