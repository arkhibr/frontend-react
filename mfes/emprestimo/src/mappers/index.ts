import type { ContratoDto, PropostaDto, ParcelaEmAtrasoDto, MovimentoDeEmprestimoDto, PrevisaoDeParcelaDto, ParcelaDetalheDto, LinhaDeCreditoDto, EmprestimoSimuladoDto } from '../dto'
import type { Contrato, Proposta, ParcelaAtraso, Movimento, ParcelaPrevista, ParcelaDetalhe, LinhaDeCredito, EmprestimoSimulado } from '../domain'

export function toContrato(d: ContratoDto): Contrato {
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

export function toProposta(d: PropostaDto): Proposta {
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

export function toParcelaAtraso(d: ParcelaEmAtrasoDto): ParcelaAtraso {
  return {
    contrato: d.NumeroDoContrato,
    vencimento: d.VencimentoDaParcela,
    valorPrestacao: d.ValorDaPrestacao,
    saldoAtual: d.ValorDoSaldoAtual,
    proximoVencimento: d.DataDoProximoVencimento,
  }
}

export const toMovimento = (d: MovimentoDeEmprestimoDto): Movimento => ({
  tipo: d.TipoLancamento, data: d.Data, historico: d.Historico, valor: d.Valor, saldo: d.Saldo,
})

export const toParcelaPrevista = (d: PrevisaoDeParcelaDto): ParcelaPrevista => ({
  numero: d.NumeroDaParcela, vencimento: d.DataDeVencimento,
  prestacao: d.ValorDaPrestacao, saldoAtual: d.ValorDoSaldoAtual,
})

export const toParcelaDetalhe = (d: ParcelaDetalheDto): ParcelaDetalhe => ({
  numero: d.NumeroDaParcela, vencimento: d.DataDeVencimento,
  prestacao: d.ValorDaPrestacao, status: d.StatusDaParcela ?? '—',
})

export const toLinhaDeCredito = (d: LinhaDeCreditoDto): LinhaDeCredito => ({
  id: d.CodigoDaLinha, descricao: d.DescricaoDaLinha,
  numeroMinimoDeParcelas: d.NumeroMinimoDeParcelas, numeroMaximoDeParcelas: d.NumeroMaximoDeParcelas,
  valorMinimo: d.ValorMinimo, valorMaximo: d.ValorMaximo,
  percentualTaxaJuros: d.PercentualDaTaxaJuros, creditoTrabalhador: d.CreditoDoTrabalhador ?? false,
})

export const toEmprestimoSimulado = (d: EmprestimoSimuladoDto): EmprestimoSimulado => ({
  parcelas: d.NumeroDeParcelas, valorBruto: d.ValorBruto, valorLiquido: d.ValorLiquido,
  cet: d.CET, cetAnual: d.CET_ANUAL, totalDasParcelas: d.TotalDoValorDasParcelas,
})
