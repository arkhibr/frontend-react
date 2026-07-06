import { describe, it, expect } from 'vitest'
import {
  toContrato, toProposta, toParcelaAtraso, toMovimento, toParcelaPrevista,
  toParcelaDetalhe, toLinhaDeCredito, toEmprestimoSimulado, toTermoConsentimento,
  toDadosTrabalhador, toDataVencimentoContratosAptos, fromSolicitacaoDeProposta,
} from '../transform.ts'
import type { ContratoLegacy, PropostaLegacy, LinhaDeCreditoLegacy, EmprestimoSimuladoLegacy } from '../legacyBackend.ts'

describe('transform', () => {
  it('toContrato mapeia PascalCase → camelCase e achata proximaParcela', () => {
    const dto: ContratoLegacy = {
      Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal', ValorLiberado: 15000,
      SaldoAtual: 9245.5, NumeroDeParcelas: 24, ParcelasRestantes: 14, TaxaDeJuros: 1.89,
      TaxaDaCETMensal: 2.11, TaxaDaCETAnual: 28.7, TemParcelasEmAtraso: false,
      ProximaParcela: { Vencimento: '2026-07-10', Valor: 944.3 },
    }
    expect(toContrato(dto)).toEqual({
      numero: '123456-7', linhaDeCredito: 'Crédito Pessoal', valorLiberado: 15000,
      saldoAtual: 9245.5, parcelas: 24, parcelasRestantes: 14, taxaDeJuros: 1.89,
      cetMensal: 2.11, cetAnual: 28.7, temAtraso: false,
      proximaParcela: { vencimento: '2026-07-10', valor: 944.3 },
    })
  })

  it('toContrato trata proximaParcela ausente como null e opcionais faltantes como padrão', () => {
    const dto = {
      Contrato: 'X', DescricaoDaLinha: 'L', ValorLiberado: 0, SaldoAtual: 0,
      NumeroDeParcelas: 0, ParcelasRestantes: 0, TaxaDeJuros: 0,
    } as ContratoLegacy
    const c = toContrato(dto)
    expect(c.proximaParcela).toBeNull()
    expect(c.cetMensal).toBe(0)
    expect(c.cetAnual).toBe(0)
    expect(c.temAtraso).toBe(false)
  })

  it('toProposta extrai o status a partir de StatusDaProposta.Value', () => {
    const dto: PropostaLegacy = {
      Contrato: 'PRP-1', DescricaoDaLinha: 'Refin', TaxaDeJuros: 1.39, DataDeEmissao: '2026-06-20T10:15:00',
      ValorBruto: 12000, ValorLiquido: 10850, NumeroDeParcelas: 24, StatusDaProposta: { Value: 'Pendente' },
    }
    expect(toProposta(dto).status).toBe('Pendente')
  })

  it('toProposta usa — quando StatusDaProposta.Value é undefined', () => {
    const dto: PropostaLegacy = {
      Contrato: 'PRP-2', DescricaoDaLinha: 'X', TaxaDeJuros: 1, DataDeEmissao: '2026-01-01',
      ValorBruto: 1000, ValorLiquido: 900, NumeroDeParcelas: 12, StatusDaProposta: {},
    }
    expect(toProposta(dto).status).toBe('—')
  })

  it('toParcelaAtraso mapeia campos corretamente', () => {
    expect(toParcelaAtraso({
      NumeroDoContrato: '001-A', VencimentoDaParcela: '2026-05-05', ValorDaPrestacao: 500,
      ValorDoSaldoAtual: 4000, DataDoProximoVencimento: '2026-06-05',
    })).toEqual({ contrato: '001-A', vencimento: '2026-05-05', valorPrestacao: 500, saldoAtual: 4000, proximoVencimento: '2026-06-05' })
  })

  it('toMovimento mapeia campos corretamente', () => {
    expect(toMovimento({ TipoLancamento: 'Credito', Data: '2026-06-01', Historico: 'Crédito', Valor: 1000, Saldo: 5000 }))
      .toEqual({ tipo: 'Credito', data: '2026-06-01', historico: 'Crédito', valor: 1000, saldo: 5000 })
  })

  it('toParcelaPrevista mapeia campos corretamente', () => {
    expect(toParcelaPrevista({ NumeroDaParcela: 1, DataDeVencimento: '2026-07-05', ValorDaPrestacao: 450, ValorDoSaldoAtual: 9000 }))
      .toEqual({ numero: 1, vencimento: '2026-07-05', prestacao: 450, saldoAtual: 9000 })
  })

  it('toParcelaDetalhe usa — quando StatusDaParcela é undefined', () => {
    const r = toParcelaDetalhe({ NumeroDaParcela: 1, DataDeVencimento: '2026-07-05', ValorDaPrestacao: 450 })
    expect(r.status).toBe('—')
  })

  it('toLinhaDeCredito mapeia todos os campos', () => {
    const dto: LinhaDeCreditoLegacy = {
      CodigoDaLinha: 10, DescricaoDaLinha: 'Pessoal', NumeroMinimoDeParcelas: 6, NumeroMaximoDeParcelas: 48,
      ValorMinimo: 1000, ValorMaximo: 30000, PercentualDaTaxaJuros: 1.5, CreditoDoTrabalhador: true,
    }
    expect(toLinhaDeCredito(dto)).toEqual({
      id: 10, descricao: 'Pessoal', numeroMinimoDeParcelas: 6, numeroMaximoDeParcelas: 48,
      valorMinimo: 1000, valorMaximo: 30000, percentualTaxaJuros: 1.5, creditoTrabalhador: true,
    })
  })

  it('toLinhaDeCredito usa false quando CreditoDoTrabalhador é undefined', () => {
    const dto = {
      CodigoDaLinha: 1, DescricaoDaLinha: 'X', NumeroMinimoDeParcelas: 1, NumeroMaximoDeParcelas: 12,
      ValorMinimo: 100, ValorMaximo: 5000, PercentualDaTaxaJuros: 1,
    } as LinhaDeCreditoLegacy
    expect(toLinhaDeCredito(dto).creditoTrabalhador).toBe(false)
  })

  it('toEmprestimoSimulado mapeia campos corretamente', () => {
    const dto: EmprestimoSimuladoLegacy = {
      NumeroDeParcelas: 24, ValorBruto: 12000, ValorLiquido: 10000, CET: 1.74, CET_ANUAL: 23.01, TotalDoValorDasParcelas: 15480,
    }
    expect(toEmprestimoSimulado(dto)).toEqual({ parcelas: 24, valorBruto: 12000, valorLiquido: 10000, cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480 })
  })

  it('toTermoConsentimento mapeia todos os campos', () => {
    expect(toTermoConsentimento({
      VersaoDoTermo: 5, TipoDoTermo: 'PROPOSTA_WEB', TextoDoTermo: 'Texto', VariaveisDosTermos: { nomeCliente: 'João' },
    })).toEqual({ versaoDoTermo: 5, tipoDoTermo: 'PROPOSTA_WEB', textoDoTermo: 'Texto', variaveisDosTermos: { nomeCliente: 'João' } })
  })

  it('toDadosTrabalhador mapeia todos os campos', () => {
    expect(toDadosTrabalhador({ PossuiAutorizacaoParaConsulta: true, ValorBaseMargem: 1800, ValorMargemDisponivel: 980.5 }))
      .toEqual({ possuiAutorizacaoParaConsulta: true, valorBaseMargem: 1800, valorMargemDisponivel: 980.5 })
  })

  it('toDataVencimentoContratosAptos mapeia todos os campos', () => {
    expect(toDataVencimentoContratosAptos({ DataDeVencimentoInicial: '2026-08-05', ContratosAptosAoRefinanciamento: [] }))
      .toEqual({ dataDeVencimentoInicial: '2026-08-05', contratosAptosAoRefinanciamento: [] })
  })

  it('fromSolicitacaoDeProposta extrai só os campos que o back-end legado consome', () => {
    expect(fromSolicitacaoDeProposta({
      valorLiquido: 10000, numeroParcelas: 24, linhaCredito: 205, dataLiberacao: '2026-06-30',
      mesAnoVencimento: '08/2026', tipoDeVencimento: 2, diaVencimento: 5,
      numeroDaContaCorrenteParaLiberacaoDoCredito: 1001, observacao: 'obs',
    })).toEqual({
      ValorLiquido: 10000, NumeroParcelas: 24, LinhaCredito: 205, DataLiberacao: '2026-06-30', Observacao: 'obs',
    })
  })
})
