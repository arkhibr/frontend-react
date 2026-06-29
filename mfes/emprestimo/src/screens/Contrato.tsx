import type { EmprestimoApi } from '../api/endpoints'
import type { View } from '../domain'
import { useAsync } from '../hooks/useAsync'
import { toContrato } from '../mappers'
import { HeaderMarca, CardBase, ActionButton } from '../components/poc'

export function Contrato(
  { api, contrato, ir, voltar }:
  { api: EmprestimoApi; contrato: string; ir: (v: View) => void; voltar: () => void },
) {
  const { data, loading, error } = useAsync(() => api.obterContrato(contrato), [contrato])
  if (loading) return (<><HeaderMarca titulo="Contrato" onVoltar={voltar} /><p>Carregando contrato…</p></>)
  if (error || !data) return (<><HeaderMarca titulo="Contrato" onVoltar={voltar} /><p role="alert">Falha ao carregar o contrato.</p></>)
  const c = toContrato(data)
  return (
    <section>
      <HeaderMarca titulo={`Contrato ${c.numero}`} onVoltar={voltar} />
      <CardBase>
        <p>{c.linhaDeCredito}</p>
        <p>Saldo atual: {c.saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p>Parcelas: {c.parcelasRestantes}/{c.parcelas}</p>
        <p>CET: {c.cetMensal}% a.m. · {c.cetAnual}% a.a.</p>
      </CardBase>
      <div className="poc-acoes">
        <ActionButton onClick={() => ir({ tela: 'emprestimo-extrato', contrato })}>Ver extrato</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-previsao', contrato })}>Ver previsão de parcelas</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-detalhamento', contrato })}>Ver detalhamento</ActionButton>
        <ActionButton onClick={() => ir({ tela: 'emprestimo-atraso', contrato })} variante="secundario">Parcelas em atraso</ActionButton>
      </div>
    </section>
  )
}
