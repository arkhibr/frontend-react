import { describe, it, expect } from 'vitest'
import { resolveTarget } from '../routing.ts'

const bffs = { emprestimo: 'http://localhost:4001', endereco: 'http://localhost:4002' }

describe('resolveTarget', () => {
  it('resolve o BFF a partir do prefixo /bff/<nome>', () => {
    expect(resolveTarget('/bff/emprestimo/contratos', bffs)).toEqual({
      name: 'emprestimo',
      baseUrl: 'http://localhost:4001',
    })
  })

  it('resolve o BFF mesmo sem sufixo de path', () => {
    expect(resolveTarget('/bff/endereco', bffs)).toEqual({
      name: 'endereco',
      baseUrl: 'http://localhost:4002',
    })
  })

  it('retorna null para um nome de BFF desconhecido', () => {
    expect(resolveTarget('/bff/inexistente/foo', bffs)).toBeNull()
  })

  it('retorna null para path fora do padrão /bff/*', () => {
    expect(resolveTarget('/saude', bffs)).toBeNull()
  })
})
