import type { View } from '../domain'

export interface NavState { atual: View; pilha: View[] }
export type NavAction = { tipo: 'ir'; view: View } | { tipo: 'voltar' }

export const estadoInicial: NavState = { atual: { tela: 'emprestimos' }, pilha: [] }

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.tipo) {
    case 'ir':
      return { atual: action.view, pilha: [...state.pilha, state.atual] }
    case 'voltar': {
      if (state.pilha.length === 0) return state
      const pilha = [...state.pilha]
      const atual = pilha.pop()!
      return { atual, pilha }
    }
  }
}
