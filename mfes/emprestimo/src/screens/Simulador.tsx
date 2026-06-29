import { useForm } from 'react-hook-form'
import type { EmprestimoApi } from '../api/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useSimulador } from '../hooks/useSimulador'
import { toLinhaDeCredito } from '../mappers'
import { HeaderMarca, CardBase, FeatureButton, ActionButton } from '../components/poc'
import { ResultadoEnvio } from './ResultadoEnvio'

export function Simulador(
  { api, tipo, voltar }:
  { api: EmprestimoApi; tipo?: 'refinanciar'; voltar: () => void },
) {
  const params = useAsync(() => api.obterParametrosSimulacao(), [])
  const sim = useSimulador()
  const { register, handleSubmit } = useForm<{ valorLiquido: number; parcelas: number }>()

  if (sim.estado.passo === 'parametros') {
    return (
      <section>
        <HeaderMarca titulo="Simular empréstimo" onVoltar={voltar} />
        {params.loading ? <p>Carregando parâmetros…</p>
          : params.error ? <p role="alert">Falha ao carregar parâmetros.</p>
          : (params.data?.LinhasDeEmprestimo ?? []).map(toLinhaDeCredito).map((l) => (
            <CardBase key={l.id}>
              <FeatureButton onClick={() => sim.escolherLinha(l)}>{l.descricao}</FeatureButton>
              <span>Taxa {l.percentualTaxaJuros}% · {l.numeroMinimoDeParcelas}–{l.numeroMaximoDeParcelas}x</span>
            </CardBase>
          ))}
      </section>
    )
  }

  if (sim.estado.passo === 'valores') {
    return (
      <section>
        <HeaderMarca titulo={sim.estado.linha!.descricao} onVoltar={() => sim.irPara('parametros')} />
        <form onSubmit={handleSubmit((v) => sim.definirValores(Number(v.valorLiquido), Number(v.parcelas)))}>
          <label>Valor líquido<input type="number" {...register('valorLiquido', { required: true })} /></label>
          <label>Parcelas<input type="number" {...register('parcelas', { required: true })} /></label>
          <ActionButton onClick={() => {}}>Simular</ActionButton>
        </form>
      </section>
    )
  }

  // passos 'resultado' / 'termo' / 'enviado': Task 14
  return <ResultadoEnvio api={api} sim={sim} tipo={tipo} voltar={voltar} />
}
