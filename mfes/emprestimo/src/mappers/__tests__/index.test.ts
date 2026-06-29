import { describe, it, expect } from 'vitest'
import { toContrato, toProposta } from '../index'
import type { ContratoDto, PropostaDto } from '../../dto'

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
})
