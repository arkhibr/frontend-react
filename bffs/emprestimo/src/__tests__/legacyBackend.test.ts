import { beforeEach, describe, expect, it } from 'vitest'
import {
  listarContratos, obterContrato, listarPropostas, excluirProposta,
  criarProposta, respostaInsercaoProposta, resetPropostasEmMemoria,
  obterExtrato, obterPrevisao, obterDetalhamento, obterAtraso,
  obterParametrosSimulacao, obterPrimeiroVencimento, simularMultiplas,
  obterTermo, preencherVariaveis, assinarTermo, obterDadosTrabalhador,
} from '../legacyBackend.ts'

beforeEach(() => resetPropostasEmMemoria())

describe('legacyBackend — contratos', () => {
  it('listarContratos retorna os dois contratos do fixture', () => {
    const contratos = listarContratos()
    expect(contratos).toHaveLength(2)
    expect(contratos[0]).toMatchObject({ Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal' })
    expect(contratos[1]).toMatchObject({ Contrato: '654321-0', TemParcelasEmAtraso: true })
  })

  it('obterContrato retorna o detalhe fixo independente do id', () => {
    expect(obterContrato('qualquer-id').Contrato).toBe('123456-7')
    expect(obterContrato('outro-id').Contrato).toBe('123456-7')
  })
})

describe('legacyBackend — propostas', () => {
  it('listarPropostas retorna a proposta do fixture', () => {
    const propostas = listarPropostas()
    expect(propostas).toHaveLength(1)
    expect(propostas[0]).toMatchObject({ Contrato: 'PRP-2026-0001', StatusDaProposta: { Value: 'Pendente' } })
  })

  it('excluirProposta remove a proposta e retorna true; retorna false se não existir', () => {
    expect(excluirProposta('PRP-2026-0001')).toBe(true)
    expect(listarPropostas()).toHaveLength(0)
    expect(excluirProposta('PRP-2026-0001')).toBe(false)
  })

  it('criarProposta calcula ValorBruto e ValorPrevistoDaPrimeiraParcela e gera o primeiro número de contrato', () => {
    const proposta = criarProposta({
      LinhaCredito: 205, ValorLiquido: 10000, NumeroParcelas: 24, DataLiberacao: '2026-06-30',
    })

    expect(proposta.Contrato).toBe('PRP-2026-0102')
    expect(proposta.DescricaoDaLinha).toBe('Refinanciamento Consignado')
    expect(proposta.TaxaDeJuros).toBe(1.39)
    expect(proposta.ValorBruto).toBe(10800)
    expect(proposta.DataDeEmissao).toBe('2026-06-30T12:00:00')
    expect(proposta.StatusDaProposta).toEqual({ Value: 'Pendente' })
    expect(listarPropostas()).toHaveLength(2)
  })

  it('respostaInsercaoProposta usa o número do contrato gerado', () => {
    expect(respostaInsercaoProposta('PRP-2026-0102')).toEqual({ numeroDoContrato: 'PRP-2026-0102' })
  })
})

describe('legacyBackend — consultas', () => {
  it('obterExtrato retorna os movimentos do fixture', () => {
    const movimentos = obterExtrato()
    expect(movimentos).toHaveLength(2)
    expect(movimentos[0]).toMatchObject({ TipoLancamento: 'Debito', Historico: 'Prestação mensal', Valor: 944.3 })
  })

  it('obterPrevisao retorna as parcelas do fixture', () => {
    expect(obterPrevisao()).toEqual([expect.objectContaining({ NumeroDaParcela: 11, ValorDaPrestacao: 944.3 })])
  })

  it('obterDetalhamento retorna as parcelas detalhadas do fixture', () => {
    expect(obterDetalhamento()).toEqual([expect.objectContaining({ NumeroDaParcela: 10, StatusDaParcela: 'Quitada' })])
  })

  it('obterAtraso retorna as parcelas em atraso do fixture', () => {
    expect(obterAtraso()).toEqual([expect.objectContaining({ NumeroDoContrato: '654321-0', ValorDaPrestacao: 615.8 })])
  })
})

describe('legacyBackend — simulação e termos', () => {
  it('obterParametrosSimulacao retorna as linhas de crédito do fixture', () => {
    expect(obterParametrosSimulacao()).toEqual([expect.objectContaining({ CodigoDaLinha: 205, CreditoDoTrabalhador: true })])
  })

  it('obterPrimeiroVencimento retorna o fixture completo', () => {
    expect(obterPrimeiroVencimento().DataDeVencimentoInicial).toBe('2026-08-05')
  })

  it('simularMultiplas retorna as previsões do fixture', () => {
    expect(simularMultiplas()).toEqual([expect.objectContaining({ CET: 1.74, TotalDoValorDasParcelas: 15480 })])
  })

  it('obterTermo retorna o termo correspondente ao tipo', () => {
    expect(obterTermo('PropostaWeb').TipoDoTermo).toBe('PROPOSTA_WEB')
    expect(obterTermo('AutorizacaoConsultaDadosDoTrabalhador').TipoDoTermo).toBe('TERMO_COMPARTILHAMENTO')
    expect(obterTermo('CONSENTIMENTO_DADOS_CADASTRAIS').TipoDoTermo).toBe('CONSENTIMENTO_DADOS_CADASTRAIS')
  })

  it('preencherVariaveis e assinarTermo replicam o comportamento fixo do handler MSW', () => {
    expect(preencherVariaveis()).toBe('Texto do termo preenchido.')
    expect(assinarTermo()).toBe(true)
  })

  it('obterDadosTrabalhador retorna o fixture', () => {
    expect(obterDadosTrabalhador()).toEqual({
      PossuiAutorizacaoParaConsulta: true, ValorBaseMargem: 1800, ValorMargemDisponivel: 980.5,
    })
  })
})
