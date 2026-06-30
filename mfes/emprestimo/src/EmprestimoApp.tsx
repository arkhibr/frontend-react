import { useReducer, useMemo } from 'react'
import { createApi } from './api/endpoints'
import { navReducer, estadoInicial } from './navigation/machine'
import type { View } from './domain'
import { ContratosPropostas } from './screens/ContratosPropostas'
import { Contrato } from './screens/Contrato'
import { ConsultaScreen } from './screens/consultas'
import { Simulador } from './screens/Simulador'
import type { MfeMountContext } from './contract'

export function EmprestimoApp({ ctx }: { ctx: MfeMountContext }) {
  const [nav, dispatch] = useReducer(navReducer, estadoInicial)
  const api = useMemo(() => createApi(ctx), [ctx])
  const ir = (view: View) => dispatch({ tipo: 'ir', view })
  const voltar = () => dispatch({ tipo: 'voltar' })
  const v = nav.atual

  return (
    <div className="emprestimo-app">
      {v.tela === 'emprestimos' && <ContratosPropostas api={api} ir={ir} />}
      {v.tela === 'emprestimo-contrato' && <Contrato api={api} contrato={v.contrato} ir={ir} voltar={voltar} />}
      {(v.tela === 'emprestimo-extrato' || v.tela === 'emprestimo-previsao'
        || v.tela === 'emprestimo-detalhamento' || v.tela === 'emprestimo-atraso')
        && <ConsultaScreen api={api} view={v} voltar={voltar} />}
      {v.tela === 'emprestimo-simulador' && <Simulador api={api} tipo={v.tipo} voltar={voltar} />}
    </div>
  )
}
