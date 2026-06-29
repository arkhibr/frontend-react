import { describe, it, expect } from 'vitest'
import { toContrato, toProposta, toParcelaAtraso, toMovimento, toParcelaPrevista, toParcelaDetalhe, toLinhaDeCredito, toEmprestimoSimulado } from '../index'
import type { ContratoDto, PropostaDto, LinhaDeCreditoDto, EmprestimoSimuladoDto } from '../../dto'

describe('mappers', () => {
  it('toContrato mapeia PascalCase → camelCase e achata proximaParcela', () => {
    const dto: ContratoDto = {
      Contrato: '123456-7', CodigoDaLinha: 101, DescricaoDaLinha: 'Crédito Pessoal',
      ValorLiberado: 15000, ValorBruto: 16250, SaldoAtual: 9245.5,
      NumeroDeParcelas: 24, ParcelasRestantes: 14, TaxaDeJuros: 1.89,
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

  it('toContrato trata proximaParcela ausente como null', () => {
    const dto = { Contrato: 'X', CodigoDaLinha: 1, DescricaoDaLinha: 'L', ValorLiberado: 0,
      ValorBruto: 0, SaldoAtual: 0, NumeroDeParcelas: 0, ParcelasRestantes: 0, TaxaDeJuros: 0 } as ContratoDto
    expect(toContrato(dto).proximaParcela).toBeNull()
  })

  it('toProposta extrai o status.Value', () => {
    const dto: PropostaDto = {
      Contrato: 'PRP-1', CodigoDaLinha: 205, DescricaoDaLinha: 'Refin', TaxaDeJuros: 1.39,
      DataDeEmissao: '2026-06-20T10:15:00', ValorBruto: 12000, ValorLiquido: 10850,
      NumeroDeParcelas: 24, ValorPrevistoDaPrimeiraParcela: 645.2,
      StatusDaProposta: { Key: 'P', Value: 'Pendente' },
    }
    expect(toProposta(dto).status).toBe('Pendente')
  })

  it('toProposta usa — quando StatusDaProposta.Value é undefined', () => {
    const dto: PropostaDto = {
      Contrato: 'PRP-2', CodigoDaLinha: 1, DescricaoDaLinha: 'X', TaxaDeJuros: 1,
      DataDeEmissao: '2026-01-01', ValorBruto: 1000, ValorLiquido: 900,
      NumeroDeParcelas: 12, ValorPrevistoDaPrimeiraParcela: 90,
      StatusDaProposta: {},
    }
    expect(toProposta(dto).status).toBe('—')
  })

  it('toParcelaAtraso mapeia campos corretamente', () => {
    const result = toParcelaAtraso({
      NumeroDoContrato: '001-A', VencimentoDaParcela: '2026-05-05',
      ValorDaPrestacao: 500, ValorDoSaldoAtual: 4000, LinhaDeEmprestimo: 'Pessoal',
      DataDoProximoVencimento: '2026-06-05', ValorNoProximoVencimento: 510,
    })
    expect(result).toEqual({
      contrato: '001-A', vencimento: '2026-05-05', valorPrestacao: 500,
      saldoAtual: 4000, proximoVencimento: '2026-06-05',
    })
  })

  it('toMovimento mapeia campos corretamente', () => {
    const result = toMovimento({ TipoLancamento: 'Credito', Data: '2026-06-01', Historico: 'Crédito', Valor: 1000, Saldo: 5000 })
    expect(result).toEqual({ tipo: 'Credito', data: '2026-06-01', historico: 'Crédito', valor: 1000, saldo: 5000 })
  })

  it('toParcelaPrevista mapeia campos corretamente', () => {
    const result = toParcelaPrevista({ NumeroDaParcela: 1, DataDeVencimento: '2026-07-05', ValorDaPrestacao: 450, ValorDoSaldoAtual: 9000 })
    expect(result).toEqual({ numero: 1, vencimento: '2026-07-05', prestacao: 450, saldoAtual: 9000 })
  })

  it('toParcelaDetalhe usa — quando StatusDaParcela é undefined', () => {
    const result = toParcelaDetalhe({ NumeroDaParcela: 1, DataDeVencimento: '2026-07-05', ValorDaPrestacao: 450 } as never)
    expect(result.status).toBe('—')
  })

  it('toLinhaDeCredito mapeia todos os campos', () => {
    const dto: LinhaDeCreditoDto = {
      CodigoDaLinha: 10, DescricaoDaLinha: 'Pessoal', NumeroMinimoDeParcelas: 6,
      NumeroMaximoDeParcelas: 48, ValorMinimo: 1000, ValorMaximo: 30000,
      PercentualDaTaxaJuros: 1.5, CreditoDoTrabalhador: true,
    }
    expect(toLinhaDeCredito(dto)).toEqual({
      id: 10, descricao: 'Pessoal', numeroMinimoDeParcelas: 6, numeroMaximoDeParcelas: 48,
      valorMinimo: 1000, valorMaximo: 30000, percentualTaxaJuros: 1.5, creditoTrabalhador: true,
    })
  })

  it('toLinhaDeCredito usa false quando CreditoDoTrabalhador é undefined', () => {
    const dto = { CodigoDaLinha: 1, DescricaoDaLinha: 'X', NumeroMinimoDeParcelas: 1,
      NumeroMaximoDeParcelas: 12, ValorMinimo: 100, ValorMaximo: 5000, PercentualDaTaxaJuros: 1 } as LinhaDeCreditoDto
    expect(toLinhaDeCredito(dto).creditoTrabalhador).toBe(false)
  })

  it('toEmprestimoSimulado mapeia campos corretamente', () => {
    const dto: EmprestimoSimuladoDto = {
      NumeroDeParcelas: 24, ValorBruto: 12000, ValorLiquido: 10000,
      CET: 1.74, CET_ANUAL: 23.01, TotalDoValorDasParcelas: 15480,
    }
    expect(toEmprestimoSimulado(dto)).toEqual({
      parcelas: 24, valorBruto: 12000, valorLiquido: 10000,
      cet: 1.74, cetAnual: 23.01, totalDasParcelas: 15480,
    })
  })
})
