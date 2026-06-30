import { useForm } from 'react-hook-form'
import type { EmprestimoApi } from '../api/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useSimulador } from '../hooks/useSimulador'
import { toLinhaDeCredito } from '../mappers'
import { HeaderMarca, CardBase, ActionButton, Metric, EmptyState } from '../components/ui'
import { ResultadoEnvio } from './ResultadoEnvio'

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export function Simulador(
  { api, tipo, voltar }:
  { api: EmprestimoApi; tipo?: 'refinanciar'; voltar: () => void },
) {
  const params = useAsync(() => api.obterParametrosSimulacao(), [])
  const sim = useSimulador()
  const { register, handleSubmit } = useForm<{ valorLiquido: number; parcelas: number }>()

  if (sim.estado.passo === 'parametros') {
    const linhas = (params.data?.LinhasDeEmprestimo ?? []).map(toLinhaDeCredito)
    return (
      <section className="emprestimo-screen">
        <HeaderMarca titulo="Simular empréstimo" subtitulo="Escolha a linha de crédito para iniciar uma nova proposta." onVoltar={voltar} />
        {params.loading ? <p className="emprestimo-feedback">Carregando parâmetros...</p>
          : params.error ? <p role="alert">Falha ao carregar parâmetros.</p>
          : linhas.length === 0 ? <EmptyState titulo="Nenhuma linha disponível" descricao="Não há linhas habilitadas para simulação neste momento." />
          : (
            <div className="emprestimo-product-grid">
              {linhas.map((l) => (
                <button key={l.id} className="emprestimo-product-card" onClick={() => sim.escolherLinha(l)}>
                  <span className="emprestimo-record__eyebrow">Linha {l.id}</span>
                  <strong>{l.descricao}</strong>
                  <span>{l.numeroMinimoDeParcelas} a {l.numeroMaximoDeParcelas} parcelas</span>
                  <div className="emprestimo-product-card__metrics">
                    <Metric rotulo="Taxa" valor={`${percentual(l.percentualTaxaJuros)} a.m.`} />
                    <Metric rotulo="Valor" valor={`${moeda(l.valorMinimo)} a ${moeda(l.valorMaximo)}`} />
                  </div>
                  <span className="emprestimo-product-card__cta">Selecionar linha</span>
                </button>
              ))}
            </div>
          )}
      </section>
    )
  }

  if (sim.estado.passo === 'valores') {
    const linha = sim.estado.linha!
    return (
      <section className="emprestimo-screen">
        <HeaderMarca titulo={linha.descricao} subtitulo="Informe a condição desejada para calcular a proposta." onVoltar={() => sim.irPara('parametros')} />
        <CardBase className="emprestimo-form-card">
          <div className="emprestimo-form-card__aside">
            <Metric rotulo="Taxa da linha" valor={`${percentual(linha.percentualTaxaJuros)} a.m.`} />
            <Metric rotulo="Faixa permitida" valor={`${moeda(linha.valorMinimo)} a ${moeda(linha.valorMaximo)}`} />
            <Metric rotulo="Parcelamento" valor={`${linha.numeroMinimoDeParcelas} a ${linha.numeroMaximoDeParcelas}x`} />
          </div>
          <form className="emprestimo-form" onSubmit={handleSubmit((v) => sim.definirValores(Number(v.valorLiquido), Number(v.parcelas)))}>
            <label>
              Valor líquido
              <input
                type="number"
                min={linha.valorMinimo}
                max={linha.valorMaximo}
                placeholder="Ex.: 5000"
                {...register('valorLiquido', { required: true })}
              />
            </label>
            <label>
              Parcelas
              <input
                type="number"
                min={linha.numeroMinimoDeParcelas}
                max={linha.numeroMaximoDeParcelas}
                placeholder={`${linha.numeroMinimoDeParcelas} a ${linha.numeroMaximoDeParcelas}`}
                {...register('parcelas', { required: true })}
              />
            </label>
            <ActionButton type="submit">Calcular simulação</ActionButton>
          </form>
        </CardBase>
      </section>
    )
  }

  // passos 'resultado' / 'termo' / 'enviado': Task 14
  return <ResultadoEnvio api={api} sim={sim} tipo={tipo} voltar={voltar} />
}
