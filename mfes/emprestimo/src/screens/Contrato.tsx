import type { EmprestimoApi } from '../api/endpoints'
import type { View } from '../domain'
import { useAsync } from '../hooks/useAsync'
import { HeaderMarca, CardBase, ActionButton, ChipStatus, Metric } from '../components/ui'

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export function Contrato(
  { api, contrato, ir, voltar }:
  { api: EmprestimoApi; contrato: string; ir: (v: View) => void; voltar: () => void },
) {
  const { data, loading, error } = useAsync(() => api.obterContrato(contrato), [contrato])
  if (loading) return (<section className="emprestimo-screen"><HeaderMarca titulo="Contrato" onVoltar={voltar} /><p className="emprestimo-feedback">Carregando contrato...</p></section>)
  if (error || !data) return (<section className="emprestimo-screen"><HeaderMarca titulo="Contrato" onVoltar={voltar} /><p role="alert">Falha ao carregar o contrato.</p></section>)
  const c = data
  return (
    <section className="emprestimo-screen">
      <HeaderMarca titulo={`Contrato ${c.numero}`} subtitulo={c.linhaDeCredito} onVoltar={voltar} />
      <CardBase className="emprestimo-detail-card">
        <div className="emprestimo-detail-card__topline">
          <span>Operação em andamento</span>
          <ChipStatus texto={c.temAtraso ? 'Em atraso' : 'Em dia'} tom={c.temAtraso ? 'erro' : 'ok'} />
        </div>
        <div className="emprestimo-metrics-grid emprestimo-metrics-grid--detail">
          <Metric rotulo="Saldo atual" valor={moeda(c.saldoAtual)} detalhe={`Liberado: ${moeda(c.valorLiberado)}`} />
          <Metric rotulo="Parcelas restantes" valor={`${c.parcelasRestantes}/${c.parcelas}`} />
          <Metric rotulo="Taxa contratual" valor={`${percentual(c.taxaDeJuros)} a.m.`} />
          <Metric rotulo="CET" valor={`${percentual(c.cetMensal)} a.m.`} detalhe={`${percentual(c.cetAnual)} a.a.`} />
        </div>
        {c.proximaParcela && (
          <div className="emprestimo-next-installment">
            <span>Próxima parcela</span>
            <strong>{moeda(c.proximaParcela.valor)}</strong>
            <span>Vencimento {c.proximaParcela.vencimento}</span>
          </div>
        )}
      </CardBase>
      <div className="emprestimo-acoes">
        <ActionButton onClick={() => ir({ tela: 'emprestimo-extrato', contrato })}>Ver extrato</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-previsao', contrato })}>Ver previsão de parcelas</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-detalhamento', contrato })}>Ver detalhamento</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-atraso', contrato })} variante="secundario">Parcelas em atraso</ActionButton>
      </div>
    </section>
  )
}
