export interface Contrato {
  numero: string
  linhaDeCredito: string
  valorLiberado: number
  saldoAtual: number
  parcelas: number
  parcelasRestantes: number
  taxaDeJuros: number
  cetMensal: number
  cetAnual: number
  temAtraso: boolean
  proximaParcela: { vencimento: string; valor: number } | null
}

export interface Proposta {
  numero: string
  linhaDeCredito: string
  taxaDeJuros: number
  dataDeEmissao: string
  valorBruto: number
  valorLiquido: number
  parcelas: number
  status: string
}

export interface ParcelaAtraso {
  contrato: string
  vencimento: string
  valorPrestacao: number
  saldoAtual: number
  proximoVencimento: string
}

export interface Movimento {
  tipo: 'Credito' | 'Debito'
  data: string
  historico: string
  valor: number
  saldo: number
}

export interface ParcelaPrevista {
  numero: number
  vencimento: string
  prestacao: number
  saldoAtual: number
}

export interface ParcelaDetalhe {
  numero: number
  vencimento: string
  prestacao: number
  status: string
}

export interface LinhaDeCredito {
  id: number
  descricao: string
  numeroMinimoDeParcelas: number
  numeroMaximoDeParcelas: number
  valorMinimo: number
  valorMaximo: number
  percentualTaxaJuros: number
  creditoTrabalhador: boolean
}

export interface EmprestimoSimulado {
  parcelas: number
  valorBruto: number
  valorLiquido: number
  cet: number
  cetAnual: number
  totalDasParcelas: number
}

export interface TermoConsentimento {
  versaoDoTermo?: number
  tipoDoTermo?: string
  textoDoTermo?: string
  variaveisDosTermos?: unknown
}

export interface DadosTrabalhador {
  possuiAutorizacaoParaConsulta?: boolean
  valorBaseMargem?: number
  valorMargemDisponivel?: number
}

export interface DataVencimentoContratosAptos {
  dataDeVencimentoInicial?: string
  contratosAptosAoRefinanciamento?: unknown[]
}

export interface SolicitacaoDeProposta {
  valorLiquido: number
  numeroParcelas: number
  linhaCredito: number
  mesAnoVencimento?: string
  dataLiberacao?: string
  tipoDeVencimento?: number
  diaVencimento?: number
  numeroDaContaCorrenteParaLiberacaoDoCredito?: number
  numeroDeContratosDeEmprestimoParaRefinanciamento?: string[]
  observacao?: string
  assinaturaDoTermoDeInclusaoDeProposta?: {
    tipoDoTermoDeAceite?: string
    sistemaDeOrigem?: string
    textoDoTermoDeAceite?: string
  }
}

export interface PropostaEnviada {
  numeroDoContrato: string
}

export interface SimulacaoRequest {
  linhaDeCredito: number
  dataDeLiberacao?: string
  valorLiquido: number
  valorDaCad?: number
  numeroDeParcelas: number[]
  taxaContratual?: number
  tipoDeVencimento?: number
  diaDeVencimento?: number
  mesAnoDeVencimento?: string
  numeroDosContratosHaRefinanciar?: string[]
}

export interface AssinarTermoRequest {
  tipoDoTermoDeAceite: string
  sistemaDeOrigem: string
}
