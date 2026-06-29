import { useState } from 'react'
import type { EmprestimoApi } from '../api/endpoints'
import type { useSimulador } from '../hooks/useSimulador'
import { useAsync } from '../hooks/useAsync'
import { toEmprestimoSimulado } from '../mappers'
import { HeaderMarca, CardBase, ActionButton } from '../components/poc'

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
    } as never)
    return r.PrevisoesDeParcelas.map(toEmprestimoSimulado)
  }, [estado.linha?.id, estado.valorLiquido, estado.parcelas])

  if (estado.passo === 'resultado') {
    const cenario = simulacao.data?.[0]
    return (
      <section>
        <HeaderMarca titulo="Resultado da simulação" onVoltar={() => irPara('valores')} />
        {simulacao.loading ? <p>Simulando…</p>
          : simulacao.error || !cenario ? <p role="alert">Falha na simulação.</p>
          : (
            <CardBase>
              <p>Valor bruto: {moeda(cenario.valorBruto)}</p>
              <p>Total das parcelas: {moeda(cenario.totalDasParcelas)}</p>
              <p>CET: {cenario.cet}% a.m. · {cenario.cetAnual}% a.a.</p>
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
          MesAnoVencimento: '08/2026', DataLiberacao: new Date('2026-06-30') as never, TipoDeVencimento: 2,
          DiaVencimento: 5, NumeroDaContaCorrenteParaLiberacaoDoCredito: 1001,
          NumeroDeContratosDeEmprestimoParaRefinanciamento: [],
          AssinaturaDoTermoDeInclusaoDeProposta: { TipoDoTermoDeAceite: 'PROPOSTA_WEB', SistemaDeOrigem: 'WEB', TextoDoTermoDeAceite: 'aceito' },
        } as never)
        setNumeroContrato(r.numeroDoContrato)
        irPara('enviado')
      }}
      voltar={() => irPara('resultado')} />
  }

  return (
    <section>
      <HeaderMarca titulo="Proposta enviada" onVoltar={voltar} />
      <CardBase><p role="status">Proposta registrada sob o contrato {numeroContrato}.</p></CardBase>
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
    <section>
      <HeaderMarca titulo="Termo de aceite" onVoltar={voltar} />
      {termo.loading ? <p>Carregando termo…</p>
        : <CardBase><p>{termo.data?.TextoDoTermo}</p></CardBase>}
      {linhaTrabalhador && dados.data && (
        <CardBase><p>Margem disponível (DataPrev): {dados.data.ValorMargemDisponivel}</p></CardBase>
      )}
      <ActionButton onClick={async () => {
        await api.preencherVariaveis(termo.data!)
        await api.assinarTermo({ TipoDoTermoDeAceite: 'PROPOSTA_WEB', SistemaDeOrigem: 'WEB' })
        await onAssinado()
      }}>Assinar e enviar proposta</ActionButton>
    </section>
  )
}
