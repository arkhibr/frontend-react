import type {
  ContratoLegacy, PropostaLegacy, ParcelaEmAtrasoLegacy, MovimentoLegacy,
  ParcelaPrevistaLegacy, ParcelaDetalheLegacy, LinhaDeCreditoLegacy,
  EmprestimoSimuladoLegacy, TermoLegacy, DadosTrabalhadorLegacy, DataVencimentoLegacy,
  PropostaMockInput,
} from './legacyBackend.ts'
import type {
  Contrato, Proposta, ParcelaAtraso, Movimento, ParcelaPrevista, ParcelaDetalhe,
  LinhaDeCredito, EmprestimoSimulado, TermoConsentimento, DadosTrabalhador,
  DataVencimentoContratosAptos, SolicitacaoDeProposta,
} from './domain.ts'

export function toContrato(d: ContratoLegacy): Contrato {
  const p = d.ProximaParcela
  return {
    numero: d.Contrato,
    linhaDeCredito: d.DescricaoDaLinha,
    valorLiberado: d.ValorLiberado,
    saldoAtual: d.SaldoAtual,
    parcelas: d.NumeroDeParcelas,
    parcelasRestantes: d.ParcelasRestantes,
    taxaDeJuros: d.TaxaDeJuros,
    cetMensal: d.TaxaDaCETMensal ?? 0,
    cetAnual: d.TaxaDaCETAnual ?? 0,
    temAtraso: d.TemParcelasEmAtraso ?? false,
    proximaParcela: p?.Vencimento != null && p.Valor != null
      ? { vencimento: p.Vencimento, valor: p.Valor }
      : null,
  }
}

export function toProposta(d: PropostaLegacy): Proposta {
  return {
    numero: d.Contrato,
    linhaDeCredito: d.DescricaoDaLinha,
    taxaDeJuros: d.TaxaDeJuros,
    dataDeEmissao: d.DataDeEmissao,
    valorBruto: d.ValorBruto,
    valorLiquido: d.ValorLiquido,
    parcelas: d.NumeroDeParcelas,
    status: d.StatusDaProposta?.Value ?? '—',
  }
}

export function toParcelaAtraso(d: ParcelaEmAtrasoLegacy): ParcelaAtraso {
  return {
    contrato: d.NumeroDoContrato,
    vencimento: d.VencimentoDaParcela,
    valorPrestacao: d.ValorDaPrestacao,
    saldoAtual: d.ValorDoSaldoAtual,
    proximoVencimento: d.DataDoProximoVencimento,
  }
}

export const toMovimento = (d: MovimentoLegacy): Movimento => ({
  tipo: d.TipoLancamento, data: d.Data, historico: d.Historico, valor: d.Valor, saldo: d.Saldo,
})

export const toParcelaPrevista = (d: ParcelaPrevistaLegacy): ParcelaPrevista => ({
  numero: d.NumeroDaParcela, vencimento: d.DataDeVencimento,
  prestacao: d.ValorDaPrestacao, saldoAtual: d.ValorDoSaldoAtual,
})

export const toParcelaDetalhe = (d: ParcelaDetalheLegacy): ParcelaDetalhe => ({
  numero: d.NumeroDaParcela, vencimento: d.DataDeVencimento,
  prestacao: d.ValorDaPrestacao, status: d.StatusDaParcela ?? '—',
})

export const toLinhaDeCredito = (d: LinhaDeCreditoLegacy): LinhaDeCredito => ({
  id: d.CodigoDaLinha, descricao: d.DescricaoDaLinha,
  numeroMinimoDeParcelas: d.NumeroMinimoDeParcelas, numeroMaximoDeParcelas: d.NumeroMaximoDeParcelas,
  valorMinimo: d.ValorMinimo, valorMaximo: d.ValorMaximo,
  percentualTaxaJuros: d.PercentualDaTaxaJuros, creditoTrabalhador: d.CreditoDoTrabalhador ?? false,
})

export const toEmprestimoSimulado = (d: EmprestimoSimuladoLegacy): EmprestimoSimulado => ({
  parcelas: d.NumeroDeParcelas, valorBruto: d.ValorBruto, valorLiquido: d.ValorLiquido,
  cet: d.CET, cetAnual: d.CET_ANUAL, totalDasParcelas: d.TotalDoValorDasParcelas,
})

export const toTermoConsentimento = (d: TermoLegacy): TermoConsentimento => ({
  versaoDoTermo: d.VersaoDoTermo, tipoDoTermo: d.TipoDoTermo,
  textoDoTermo: d.TextoDoTermo, variaveisDosTermos: d.VariaveisDosTermos,
})

export const toDadosTrabalhador = (d: DadosTrabalhadorLegacy): DadosTrabalhador => ({
  possuiAutorizacaoParaConsulta: d.PossuiAutorizacaoParaConsulta,
  valorBaseMargem: d.ValorBaseMargem, valorMargemDisponivel: d.ValorMargemDisponivel,
})

export const toDataVencimentoContratosAptos = (d: DataVencimentoLegacy): DataVencimentoContratosAptos => ({
  dataDeVencimentoInicial: d.DataDeVencimentoInicial,
  contratosAptosAoRefinanciamento: d.ContratosAptosAoRefinanciamento,
})

export function fromSolicitacaoDeProposta(input: SolicitacaoDeProposta): PropostaMockInput {
  return {
    ValorLiquido: input.valorLiquido,
    NumeroParcelas: input.numeroParcelas,
    LinhaCredito: input.linhaCredito,
    DataLiberacao: input.dataLiberacao,
    Observacao: input.observacao,
  }
}
