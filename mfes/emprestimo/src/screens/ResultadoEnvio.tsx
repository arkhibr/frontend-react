import { useState } from 'react'
import type { EmprestimoApi } from '../api/endpoints'
import type { useSimulador } from '../hooks/useSimulador'
import type { SimulacaoDeEmprestimoDto, SolicitacaoDePropostaDto } from '../dto'
import { useAsync } from '../hooks/useAsync'
import { toEmprestimoSimulado } from '../mappers'
import { HeaderMarca, CardBase, ActionButton, Metric } from '../components/ui'

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ResultadoEnvio(
  { api, sim, voltar }:
  { api: EmprestimoApi; sim: ReturnType<typeof useSimulador>; tipo?: 'refinanciar'; voltar: () => void },
) {
  const { estado, irPara } = sim
  const [numeroContrato, setNumeroContrato] = useState<string | null>(null)

  const simulacao = useAsync(async () => {
    const r = await api.simularMultiplas({
      LinhaDeCredito: estado.linha!.id, DataDeLiberacao: '2026-06-30',
      ValorLiquido: estado.valorLiquido, ValorDaCAD: -1, NumeroDeParcelas: [estado.parcelas],
      TaxaContratual: -1, TipoDeVencimento: 2, DiaDeVencimento: 5, MesAnoDeVencimento: '08/2026',
      NumeroDosContratosHaRefinanciar: [],
    } satisfies SimulacaoDeEmprestimoDto)
    return r.PrevisoesDeParcelas.map(toEmprestimoSimulado)
  }, [estado.linha?.id, estado.valorLiquido, estado.parcelas])

  if (estado.passo === 'resultado') {
    const cenario = simulacao.data?.[0]
    return (
      <section className="emprestimo-screen">
        <HeaderMarca titulo="Resultado da simulação" subtitulo="Confira os valores antes de seguir para o termo." onVoltar={() => irPara('valores')} />
        {simulacao.loading ? <p className="emprestimo-feedback">Simulando...</p>
          : simulacao.error || !cenario ? <p role="alert">Falha na simulação.</p>
          : (
            <CardBase className="emprestimo-detail-card">
              <div className="emprestimo-metrics-grid emprestimo-metrics-grid--detail">
                <Metric rotulo="Valor líquido" valor={moeda(cenario.valorLiquido)} />
                <Metric rotulo="Valor bruto" valor={moeda(cenario.valorBruto)} />
                <Metric rotulo="Parcelas" valor={`${cenario.parcelas}x`} detalhe={`Total: ${moeda(cenario.totalDasParcelas)}`} />
                <Metric rotulo="CET" valor={`${cenario.cet}% a.m.`} detalhe={`${cenario.cetAnual}% a.a.`} />
              </div>
              <ActionButton onClick={() => irPara('termo')}>Continuar para o termo</ActionButton>
            </CardBase>
          )}
      </section>
    )
  }

  if (estado.passo === 'termo') {
    return <PassoTermo api={api} linhaTrabalhador={estado.linha!.creditoTrabalhador}
      onAssinado={async () => {
        const r = await api.enviarProposta({
          ValorLiquido: estado.valorLiquido, NumeroParcelas: estado.parcelas, LinhaCredito: estado.linha!.id,
          MesAnoVencimento: '08/2026', DataLiberacao: '2026-06-30', TipoDeVencimento: 2,
          DiaVencimento: 5, NumeroDaContaCorrenteParaLiberacaoDoCredito: 1001,
          NumeroDeContratosDeEmprestimoParaRefinanciamento: [],
          AssinaturaDoTermoDeInclusaoDeProposta: { TipoDoTermoDeAceite: 'PROPOSTA_WEB', SistemaDeOrigem: 'WEB', TextoDoTermoDeAceite: 'aceito' },
        } satisfies SolicitacaoDePropostaDto)
        setNumeroContrato(r.numeroDoContrato)
        irPara('enviado')
      }}
      voltar={() => irPara('resultado')} />
  }

  return (
    <section className="emprestimo-screen">
      <HeaderMarca titulo="Proposta enviada" subtitulo="A operação foi registrada para acompanhamento." onVoltar={voltar} />
      <CardBase className="emprestimo-success-card">
        <span>Contrato gerado</span>
        <strong role="status">{numeroContrato ?? 'Aguardando confirmação'}</strong>
        <p>Proposta registrada{numeroContrato ? ` sob o contrato ${numeroContrato}` : ''}. Use a aba de propostas para acompanhar a análise e os próximos passos.</p>
      </CardBase>
    </section>
  )
}

function PassoTermo(
  { api, linhaTrabalhador, onAssinado, voltar }:
  { api: EmprestimoApi; linhaTrabalhador: boolean; onAssinado: () => Promise<void>; voltar: () => void },
) {
  const termo = useAsync(() => api.obterTermo('PropostaWeb'), [])
  const dados = useAsync(() => linhaTrabalhador ? api.obterDadosTrabalhador()
    : Promise.resolve(null), [linhaTrabalhador])
  return (
    <section className="emprestimo-screen">
      <HeaderMarca titulo="Termo de aceite" subtitulo="Leia as condições antes de enviar a proposta." onVoltar={voltar} />
      {termo.loading ? <p className="emprestimo-feedback">Carregando termo...</p>
        : <CardBase className="emprestimo-term-card"><p>{termo.data?.TextoDoTermo}</p></CardBase>}
      {linhaTrabalhador && dados.data && (
        <CardBase className="emprestimo-inline-panel">
          <Metric rotulo="Margem disponível DataPrev" valor={dados.data.ValorMargemDisponivel?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—'} />
        </CardBase>
      )}
      <ActionButton onClick={async () => {
        await api.preencherVariaveis(termo.data!)
        await api.assinarTermo({ TipoDoTermoDeAceite: 'PROPOSTA_WEB', SistemaDeOrigem: 'WEB' })
        await onAssinado()
      }}>Assinar e enviar proposta</ActionButton>
    </section>
  )
}
