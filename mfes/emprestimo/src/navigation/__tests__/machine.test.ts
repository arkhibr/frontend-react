import { describe, it, expect } from 'vitest'
import { navReducer, estadoInicial } from '../machine'

describe('navReducer', () => {
  it('ir empilha a view atual e troca para a nova', () => {
    const s = navReducer(estadoInicial, { tipo: 'ir', view: { tela: 'emprestimo-contrato', contrato: '1' } })
    expect(s.atual).toEqual({ tela: 'emprestimo-contrato', contrato: '1' })
    expect(s.pilha).toEqual([{ tela: 'emprestimos' }])
  })

  it('voltar desempilha para a view anterior', () => {
    const s1 = navReducer(estadoInicial, { tipo: 'ir', view: { tela: 'emprestimo-simulador' } })
    const s2 = navReducer(s1, { tipo: 'voltar' })
    expect(s2.atual).toEqual({ tela: 'emprestimos' })
    expect(s2.pilha).toEqual([])
  })

  it('voltar na raiz é no-op', () => {
    expect(navReducer(estadoInicial, { tipo: 'voltar' })).toEqual(estadoInicial)
  })
})
