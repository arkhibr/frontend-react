import { useState } from 'react'
import type { EmprestimoApi } from '../api/endpoints'
import type { useSimulador } from '../hooks/useSimulador'
import { useAsync } from '../hooks/useAsync'
import { HeaderMarca, CardBase, ActionButton, Metric } from '../components/ui'

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ResultadoEnvio(
  { api, sim, voltar }:
  { api: EmprestimoApi; sim: ReturnType<typeof useSimulador>; tipo?: 'refinanciar'; voltar: () => void },
) {
  const { estado, irPara } = sim
  const [numeroContrato, setNumeroContrato] = useState<string | null>(null)

  const simulacao = useAsync(async () => {
    const cenarios = await api.simularMultiplas({
      linhaDeCredito: estado.linha!.id, dataDeLiberacao: '2026-06-30',
      valorLiquido: estado.valorLiquido, valorDaCad: -1, numeroDeParcelas: [estado.parcelas],
      taxaContratual: -1, tipoDeVencimento: 2, diaDeVencimento: 5, mesAnoDeVencimento: '08/2026',
      numeroDosContratosHaRefinanciar: [],
    })
    return cenarios
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
          valorLiquido: estado.valorLiquido, numeroParcelas: estado.parcelas, linhaCredito: estado.linha!.id,
          mesAnoVencimento: '08/2026', dataLiberacao: '2026-06-30', tipoDeVencimento: 2,
          diaVencimento: 5, numeroDaContaCorrenteParaLiberacaoDoCredito: 1001,
          numeroDeContratosDeEmprestimoParaRefinanciamento: [],
          assinaturaDoTermoDeInclusaoDeProposta: { tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB', textoDoTermoDeAceite: 'aceito' },
        })
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
        : <CardBase className="emprestimo-term-card"><p>{termo.data?.textoDoTermo}</p></CardBase>}
      {linhaTrabalhador && dados.data && (
        <CardBase className="emprestimo-inline-panel">
          <Metric rotulo="Margem disponível DataPrev" valor={dados.data.valorMargemDisponivel?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—'} />
        </CardBase>
      )}
      <ActionButton onClick={async () => {
        await api.preencherVariaveis(termo.data!)
        await api.assinarTermo({ tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB' })
        await onAssinado()
      }}>Assinar e enviar proposta</ActionButton>
    </section>
  )
}
