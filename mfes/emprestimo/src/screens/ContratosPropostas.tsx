import { useState } from 'react'
import type { EmprestimoApi } from '../api/endpoints'
import type { View } from '../domain'
import { useAsync } from '../hooks/useAsync'
import { HeaderMarca, CardBase, ChipStatus, ActionButton, Metric, EmptyState } from '../components/ui'

const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const percentual = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

export function ContratosPropostas({ api, ir }: { api: EmprestimoApi; ir: (v: View) => void }) {
  const [aba, setAba] = useState<'contratos' | 'propostas'>('contratos')
  const contratos = useAsync(() => api.listarContratos(), [])
  const propostas = useAsync(() => api.listarPropostas(), [])
  const listaContratos = contratos.data ?? []
  const listaPropostas = propostas.data ?? []
  const saldoTotal = listaContratos.reduce((total, contrato) => total + contrato.saldoAtual, 0)
  const contratosEmAtraso = listaContratos.filter((contrato) => contrato.temAtraso).length

  return (
    <section className="emprestimo-screen">
      <HeaderMarca
        titulo="Empréstimos"
        subtitulo="Acompanhe contratos ativos, propostas e simule novas operações."
        acao={<ActionButton className="emprestimo-action-button--compact" onClick={() => ir({ tela: 'emprestimo-simulador' })}>Simular novo empréstimo</ActionButton>}
      />

      <div className="emprestimo-metrics-grid" aria-label="Resumo da carteira">
        <Metric rotulo="Saldo em aberto" valor={contratos.loading ? 'Carregando' : moeda(saldoTotal)} />
        <Metric rotulo="Contratos ativos" valor={contratos.loading ? '—' : listaContratos.length} detalhe={`${contratosEmAtraso} em atraso`} />
        <Metric rotulo="Propostas" valor={propostas.loading ? '—' : listaPropostas.length} detalhe="em acompanhamento" />
      </div>

      <nav className="emprestimo-abas" role="tablist">
        <button role="tab" aria-selected={aba === 'contratos'} onClick={() => setAba('contratos')}>Contratos</button>
        <button role="tab" aria-selected={aba === 'propostas'} onClick={() => setAba('propostas')}>Propostas</button>
      </nav>

      {aba === 'contratos' && (
        contratos.loading ? <p className="emprestimo-feedback">Carregando contratos...</p>
        : contratos.error ? <p role="alert">Não foi possível carregar os contratos.</p>
        : listaContratos.length === 0 ? <EmptyState titulo="Nenhum contrato ativo" descricao="Quando houver contratos, eles aparecerão nesta carteira." />
        : (
          <div className="emprestimo-record-list">
            {listaContratos.map((c) => (
              <CardBase key={c.numero} className="emprestimo-record">
                <button className="emprestimo-card__link emprestimo-record__main" onClick={() => ir({ tela: 'emprestimo-contrato', contrato: c.numero })}>
                  <span className="emprestimo-record__eyebrow">Contrato</span>
                  <strong><span>{c.numero}</span><span> — {c.linhaDeCredito}</span></strong>
                  <span>{c.parcelasRestantes} de {c.parcelas} parcelas restantes</span>
                </button>
                <div className="emprestimo-record__metrics">
                  <Metric rotulo="Saldo atual" valor={moeda(c.saldoAtual)} />
                  <Metric rotulo="Taxa" valor={`${percentual(c.taxaDeJuros)} a.m.`} />
                  <Metric rotulo="Próxima parcela" valor={c.proximaParcela ? moeda(c.proximaParcela.valor) : '—'} detalhe={c.proximaParcela?.vencimento} />
                </div>
                <div className="emprestimo-record__status">
                  <ChipStatus texto={c.temAtraso ? 'Em atraso' : 'Em dia'} tom={c.temAtraso ? 'erro' : 'ok'} />
                </div>
              </CardBase>
            ))}
          </div>
        )
      )}

      {aba === 'propostas' && (
        propostas.loading ? <p className="emprestimo-feedback">Carregando propostas...</p>
        : propostas.error ? <p role="alert">Não foi possível carregar as propostas.</p>
        : listaPropostas.length === 0 ? <EmptyState titulo="Nenhuma proposta em aberto" descricao="Novas simulações enviadas aparecerão aqui para acompanhamento." />
        : (
          <div className="emprestimo-record-list">
            {listaPropostas.map((p) => (
              <CardBase key={p.numero} className="emprestimo-record">
                <div className="emprestimo-record__main">
                  <span className="emprestimo-record__eyebrow">Proposta</span>
                  <strong>{p.numero} — {p.linhaDeCredito}</strong>
                  <span>Emitida em {p.dataDeEmissao}</span>
                </div>
                <div className="emprestimo-record__metrics">
                  <Metric rotulo="Valor líquido" valor={moeda(p.valorLiquido)} />
                  <Metric rotulo="Valor bruto" valor={moeda(p.valorBruto)} />
                  <Metric rotulo="Condição" valor={`${p.parcelas}x`} detalhe={`${percentual(p.taxaDeJuros)} a.m.`} />
                </div>
                <div className="emprestimo-record__status">
                  <ChipStatus texto={p.status} tom="aviso" />
                </div>
              </CardBase>
            ))}
          </div>
        )
      )}
    </section>
  )
}
