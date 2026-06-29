import type { EmprestimoApi } from '../api/endpoints'
import type { View, Movimento, ParcelaPrevista, ParcelaDetalhe, ParcelaAtraso } from '../domain'
import { toMovimento, toParcelaPrevista, toParcelaDetalhe, toParcelaAtraso } from '../mappers'
import { ConsultaTabela, type Coluna } from '../components/ConsultaTabela'

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ConsultaScreen(
  { api, view, voltar }:
  { api: EmprestimoApi; view: Extract<View, { tela: 'emprestimo-extrato' | 'emprestimo-previsao' | 'emprestimo-detalhamento' | 'emprestimo-atraso' }>; voltar: () => void },
) {
  const id = view.contrato
  switch (view.tela) {
    case 'emprestimo-extrato': {
      const colunas: Coluna<Movimento>[] = [
        { cabecalho: 'Data', valor: (m) => m.data },
        { cabecalho: 'Histórico', valor: (m) => m.historico },
        { cabecalho: 'Tipo', valor: (m) => m.tipo },
        { cabecalho: 'Valor', valor: (m) => moeda(m.valor) },
        { cabecalho: 'Saldo', valor: (m) => moeda(m.saldo) },
      ]
      return <ConsultaTabela titulo="Extrato" colunas={colunas} voltar={voltar}
        carregar={async () => (await api.obterExtrato(id, '2026-05-30', '2026-06-29')).MovimentoDeEmprestimo?.map(toMovimento) ?? []} />
    }
    case 'emprestimo-previsao': {
      const colunas: Coluna<ParcelaPrevista>[] = [
        { cabecalho: 'Parcela', valor: (p) => String(p.numero) },
        { cabecalho: 'Vencimento', valor: (p) => p.vencimento },
        { cabecalho: 'Prestação', valor: (p) => moeda(p.prestacao) },
        { cabecalho: 'Saldo', valor: (p) => moeda(p.saldoAtual) },
      ]
      return <ConsultaTabela titulo="Previsão de parcelas" colunas={colunas} voltar={voltar}
        carregar={async () => (await api.obterPrevisao(id)).Parcelas.map(toParcelaPrevista)} />
    }
    case 'emprestimo-detalhamento': {
      const colunas: Coluna<ParcelaDetalhe>[] = [
        { cabecalho: 'Parcela', valor: (p) => String(p.numero) },
        { cabecalho: 'Vencimento', valor: (p) => p.vencimento },
        { cabecalho: 'Prestação', valor: (p) => moeda(p.prestacao) },
        { cabecalho: 'Status', valor: (p) => p.status },
      ]
      return <ConsultaTabela titulo="Detalhamento" colunas={colunas} voltar={voltar}
        carregar={async () => (await api.obterDetalhamento(id)).map(toParcelaDetalhe)} />
    }
    case 'emprestimo-atraso': {
      const colunas: Coluna<ParcelaAtraso>[] = [
        { cabecalho: 'Vencimento', valor: (p) => p.vencimento },
        { cabecalho: 'Prestação', valor: (p) => moeda(p.valorPrestacao) },
        { cabecalho: 'Saldo', valor: (p) => moeda(p.saldoAtual) },
        { cabecalho: 'Próx. vencimento', valor: (p) => p.proximoVencimento },
      ]
      return <ConsultaTabela titulo="Parcelas em atraso" colunas={colunas} voltar={voltar}
        carregar={async () => (await api.obterAtraso(id)).ParcelasEmAtraso.map(toParcelaAtraso)} />
    }
    default: {
      const _exhaustive: never = view
      return _exhaustive
    }
  }
}
