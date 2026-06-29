// DTOs — backend contract types (PascalCase, mirrors server payload)

export interface ParcelaEmAtrasoDto {
  NumeroDoContrato: string
  VencimentoDaParcela: string
  ValorDaPrestacao: number
  ValorDoSaldoAtual: number
  LinhaDeEmprestimo: string
  DataDoProximoVencimento: string
  ValorNoProximoVencimento: number
}

export interface ContratoDto {
  Contrato: string
  Conta?: string
  CodigoDaLinha: number
  DescricaoDaLinha: string
  ValorLiberado: number
  ValorBruto: number
  SaldoAtual: number
  DataUltimaAtualizacao?: string
  NumeroDeParcelas: number
  ParcelasRestantes: number
  VencimentoDoContrato?: string
  DataDeVencimentoInicial?: string
  DataDeCadastroDoContrato?: string
  AgenteDeCredito?: string
  FormaDePagamento?: number
  TipoDeVencimento?: number
  DataDeLiberacaoDoContrato?: string
  TaxaDeJuros: number
  ValorDaCAD?: number
  ValorDoIOF?: number
  ValorDoSeguro?: number
  TaxaDaCETMensal?: number
  TaxaDaCETAnual?: number
  ValorRefinanciado?: number
  StatusDoEmprestimo?: number
  TemParcelasEmAtraso?: boolean
  BaixadoComoPrejuizo?: boolean
  Refinanciado?: boolean
  Quitado?: boolean
  ProximaParcela?: { Vencimento?: string; FormaDePagamento?: number; Valor?: number }
  DataDoUltimoPagamento?: string
  TotalEmAtraso?: number
  CodigoDaCarteiraContabil?: string
  DescricaoDaCarteiraContabil?: string
  StatusDaCessao?: number
  ParcelasEmAtraso?: ParcelaEmAtrasoDto[]
  NumeroDeBeneficio?: string
  Observacao?: string
  SiglaDoIndiceDeCorrecaoMonetaria?: string
  TaxaDeJurosCapitalizados?: number
}

export interface PropostaDto {
  Contrato: string
  CodigoDaLinha: number
  DescricaoDaLinha: string
  TaxaDeJuros: number
  DataDeEmissao: string
  ValorBruto: number
  ValorLiquido: number
  NumeroDeParcelas: number
  ValorPrevistoDaPrimeiraParcela: number
  StatusDaProposta: { Key?: string; Value?: string }
  Observacao?: string
  CpfDoCliente?: string
  ValorDoIOF?: number
  NomeDoCliente?: string
  ValorDoRefinanciamento?: number
  ValorDaCad?: number
  NumeroDeBeneficio?: string
  VencimentoInicial?: string
  VencimentoFinal?: string
  CadastradaNaWeb?: boolean
  SiglaDoIndiceDeCorrecaoMonetaria?: string
  TaxaDeJurosCapitalizados?: number
}

export interface LinhaDeCreditoDto {
  CodigoDaLinha: number
  DescricaoDaLinha: string
  NumeroMinimoDeParcelas: number
  NumeroMaximoDeParcelas: number
  TipoDeVencimento?: number
  DiasDeVencimentoDataBase?: number[]
  ValorMinimo: number
  ValorMaximo: number
  SomenteSimulacao?: boolean
  PermiteRefinanciarEmprestimo?: boolean
  FormaDeLiberacao?: { Key?: string; Value?: string }
  MesAnoInicialParaDataDeVencimento?: string
  NumeroMaximoDeContratos?: number
  FormaDePagamento?: { Key?: string; Value?: string }
  TipoDeFinanciamento?: { Key?: string; Value?: string }
  CodigoDaLinhaDeAnaliseDeCredito?: number
  PermiteQueContratoSejaRefinanciado?: boolean
  EhLinhaDeCreditoRotativo?: boolean
  DeveExigirPropostasComRefinanciamento?: boolean
  LimitarValorDoEmprestimoApenasAoRefinanciamento?: boolean
  DeveExigirRefinanciamentoSeHouverContratoParaRefinanciarNaMesmaLinha?: boolean
  PercentualMinimoDeValorLiquidoParaRefinanciamento?: number
  HabilitadaParaPessoasFisicas?: boolean
  HabilitadaParaPessoasJuridicas?: boolean
  DataDeLiberacaoMinima?: string
  ParametrosDaCAD?: Record<string, unknown>
  NaoConsiderarOsParametrosDeRefinanciamento?: boolean
  NumeroDeAvalistas?: number
  PercentualDaTaxaJuros: number
  ExigirMotivoDaPropostaWeb?: boolean
  PossuiAlgumaRestricaoWeb?: boolean
  CreditoDoTrabalhador: boolean
}

export interface MovimentoDeEmprestimoDto {
  TipoLancamento: 'Credito' | 'Debito'
  Data: string
  Historico: string
  Valor: number
  Saldo: number
}

export interface EmprestimoExtratoDto {
  Contrato: string
  DataInicial?: string
  DataFinal?: string
  MovimentoDeEmprestimo?: MovimentoDeEmprestimoDto[]
  Total?: number
  FormaDePagamento?: string
  NomeDaLinhaDeFinanciamento?: string
  QuantidadeDeParcelas?: number
  QuantidadeDeParcelasRestantes?: number
  DataDeVencimentoInicial?: string
  DataDeVencimentoFinal?: string
  DadosOuvidoria?: string
  DadosAdicionaisDeOuvidoria?: string
}

export interface PrevisaoDeParcelaDto {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaAmortizacao?: number
  ValorDaCorrecao?: number
  ValorDoJuros?: number
  ValorDoSeguro?: number
  ValorTaxaBancaria?: number
  ValorDaPrestacao: number
  ValorDoSaldoAnterior?: number
  ValorDoJurosCapitalizados?: number
  ValorDoSaldoAtual: number
}

export interface PrevisaoDeParcelasDto {
  NumeroDoContrato?: string
  Parcelas: PrevisaoDeParcelaDto[]
}

export interface ParcelaDetalheDto {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaAmortizacao?: number
  ValorDaCorrecao?: number
  ValorDosJuros?: number
  ValorDoSeguro?: number
  ValorDasTaxas?: number
  ValorDaMora?: number
  ValorDaMulta?: number
  ValorDaPrestacao: number
  DataDePagamento?: string
  ValorPago?: number
  ValorAPagar?: number
  StatusDaParcela?: 'A Vencer' | 'Parcial' | 'Quitada'
  PermiteVisualizarParcela?: boolean
}

export interface EmprestimoEmAtrasoDto {
  ParcelasEmAtraso: ParcelaEmAtrasoDto[]
}

export interface ParametrosParaSimulacaoDto {
  LinhasDeEmprestimo: LinhaDeCreditoDto[]
  TiposDeVencimentoDeEmprestimo?: unknown[]
  DataDeLiberacaoMinima?: string
  ContasCorrente?: unknown[]
  ModuloContaCorrenteHabilitado?: boolean
  PodeSolicitarProposta?: boolean
  EhSimulacaoSemLogin?: boolean
  ObrigarDadosComplementaresNaSimulacaoSemLogin?: boolean
  ResumoDeEmprestimo?: Record<string, unknown>
  PodeSolicitarPropostaDeEmprestimoCasoAPessoaSejaObrigadaATerUmEmail?: boolean
  DeveExigirSenhaDeLoginAoSolicitarPropostaDeEmprestimo?: boolean
  PodeAlterarADataDeVencimentoInicial?: boolean
  PodeAlterarADataDeLiberacao?: boolean
  MensagemDeSucessoAoInserirEmprestimo?: string
  PodeVisualizarInformacoesDoEmprestimo?: boolean
  DadosBancarios?: Record<string, unknown>
  DeveExigirOAceiteDoTermoAoSolicitarProposta?: boolean
  MensagemDoTermoDeAceiteAoSolicitarPropostaDeEmprestimo?: string
  PermiteRefinanciamentoDeContratosDeEmprestimo?: boolean
  PodeSimularPropostaDeEmprestimos?: boolean
  UtilizaSelecaoDeBancoParaLiberacaoDeCredito?: boolean
  ContasParaLiberacaoDeCredito?: unknown[]
  ListaDeBancos?: unknown[]
  PermiteEditarDadosBancariosParaLiberacaoDoCredito?: boolean
  CNPJDaInstituicaoFinanceira?: string
  MensagemSobreDadosBancariosAoSolicitarPropostaDeEmprestimo?: string
  ControlarLimiteDeCreditoNaWeb?: boolean
  ObrigarSelecaoDeAvalista?: boolean
  CalcularEmprestimoPorValorBruto?: boolean
  DocumentosExigidosNaSolicitacaoDeProposta?: string
  UtilizaDataDeLiberacaoPadrao?: boolean
  DataDeLiberacaoPadrao?: string
  ConfiguracaoDeIdentificacaoPositiva?: unknown
  TemAutorizacaoParaConsultaDeDados?: boolean
}

export interface EmprestimoSimuladoDto {
  Conta?: string
  ValorBruto: number
  ValorDoSeguro?: number
  ValorDaCAD?: number
  ValorDoIOF?: number
  ValorLiquido: number
  TaxaDeJuros?: number
  CET: number
  CET_ANUAL: number
  DataDeLiberacao?: string
  DataDeVencimentoInicial?: string
  DataDeVencimentoFinal?: string
  NumeroDeParcelas: number
  TotalDeAmortizacao?: number
  TotalDaTaxaDeServico?: number
  TotalDoSeguro?: number
  TotalDaTaxaDeCorrecao?: number
  TotalDeJuros?: number
  TotalDoValorDasParcelas: number
  ValorDoRefinanciamento?: number
  Parcelas?: unknown[]
  DetalhamentoDaCET?: unknown
  EncargosEmCasoDeAtraso?: unknown
}

export interface EmprestimosSimuladosDto {
  PrevisoesDeParcelas: EmprestimoSimuladoDto[]
}

export interface DataDeVencimentoEContratosAptosDto {
  DataDeVencimentoInicial?: string
  ContratosAptosAoRefinanciamento?: unknown[]
}

export interface SimulacaoDeEmprestimoDto {
  LinhaDeCredito: number
  DataDeLiberacao?: string
  ValorLiquido: number
  ValorDaCAD?: number
  NumeroDeParcelas: number[]
  TaxaContratual?: number
  TipoDeVencimento?: number
  DiaDeVencimento?: number
  MesAnoDeVencimento?: string
  NumeroDosContratosHaRefinanciar?: string[]
  DadosComplementaresDeSimulacaoSemLogin?: unknown
}

export interface SolicitacaoDePropostaDto {
  ValorLiquido: number
  NumeroParcelas: number
  LinhaCredito: number
  MesAnoVencimento?: string
  DataLiberacao?: string
  TipoDeVencimento?: number
  DiaVencimento?: number
  NumeroDaContaCorrenteParaLiberacaoDoCredito?: number
  NumeroDeContratosDeEmprestimoParaRefinanciamento?: string[]
  Observacao?: string
  IdentificacaoPositiva?: { Id?: string; EncryptedPassword?: string }
  CpfOuCnpjDosAvalistas?: string[]
  DocumentosDigitais?: Array<{ TipoDoDocumento?: string; FileId?: string; FileName?: string }>
  AssinaturaDoTermoDeInclusaoDeProposta?: { TipoDoTermoDeAceite?: string; SistemaDeOrigem?: string; TextoDoTermoDeAceite?: string }
}

export interface TermoConsentimentoDto {
  VersaoDoTermo?: number
  TipoDoTermo?: string
  TextoDoTermo?: string
  VariaveisDosTermos?: unknown
}

export interface DadosTrabalhadorDataPrevDto {
  PossuiAutorizacaoParaConsulta?: boolean
  ValorBaseMargem?: number
  ValorMargemDisponivel?: number
}

export interface InsercaoDePropostaResponse {
  numeroDoContrato: string
}
