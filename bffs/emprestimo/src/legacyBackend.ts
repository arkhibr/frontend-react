import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function readFixture<T>(filename: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, filename), 'utf-8')) as T
}

export interface ContratoLegacy {
  Contrato: string
  DescricaoDaLinha: string
  ValorLiberado: number
  SaldoAtual: number
  NumeroDeParcelas: number
  ParcelasRestantes: number
  TaxaDeJuros: number
  TaxaDaCETMensal?: number
  TaxaDaCETAnual?: number
  TemParcelasEmAtraso?: boolean
  ProximaParcela?: { Vencimento?: string; Valor?: number }
}

export interface PropostaLegacy {
  Contrato: string
  DescricaoDaLinha: string
  TaxaDeJuros: number
  DataDeEmissao: string
  ValorBruto: number
  ValorLiquido: number
  NumeroDeParcelas: number
  StatusDaProposta: { Value?: string }
}

export interface ParcelaEmAtrasoLegacy {
  NumeroDoContrato: string
  VencimentoDaParcela: string
  ValorDaPrestacao: number
  ValorDoSaldoAtual: number
  DataDoProximoVencimento: string
}

export interface MovimentoLegacy {
  TipoLancamento: 'Credito' | 'Debito'
  Data: string
  Historico: string
  Valor: number
  Saldo: number
}

export interface ParcelaPrevistaLegacy {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaPrestacao: number
  ValorDoSaldoAtual: number
}

export interface ParcelaDetalheLegacy {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaPrestacao: number
  StatusDaParcela?: string
}

export interface LinhaDeCreditoLegacy {
  CodigoDaLinha: number
  DescricaoDaLinha: string
  NumeroMinimoDeParcelas: number
  NumeroMaximoDeParcelas: number
  ValorMinimo: number
  ValorMaximo: number
  PercentualDaTaxaJuros: number
  CreditoDoTrabalhador?: boolean
}

export interface EmprestimoSimuladoLegacy {
  NumeroDeParcelas: number
  ValorBruto: number
  ValorLiquido: number
  CET: number
  CET_ANUAL: number
  TotalDoValorDasParcelas: number
}

export interface TermoLegacy {
  VersaoDoTermo?: number
  TipoDoTermo?: string
  TextoDoTermo?: string
  VariaveisDosTermos?: unknown
}

export interface DadosTrabalhadorLegacy {
  PossuiAutorizacaoParaConsulta?: boolean
  ValorBaseMargem?: number
  ValorMargemDisponivel?: number
}

export interface DataVencimentoLegacy {
  DataDeVencimentoInicial?: string
  ContratosAptosAoRefinanciamento?: unknown[]
}

export interface PropostaMockInput {
  ValorLiquido: number
  NumeroParcelas: number
  LinhaCredito: number
  DataLiberacao?: string
  Observacao?: string
}

const contratosList = readFixture<ContratoLegacy[]>('contratos.list.json')
const contratosDetail = readFixture<ContratoLegacy>('contratos.detail.json')
const propostasListFixture = readFixture<PropostaLegacy[]>('propostas.list.json')
const extratoFixture = readFixture<{ MovimentoDeEmprestimo?: MovimentoLegacy[] }>('extrato.by-period.json')
const previsaoFixture = readFixture<{ Parcelas: ParcelaPrevistaLegacy[] }>('previsao.by-contract.json')
const detalhamentoFixture = readFixture<ParcelaDetalheLegacy[]>('detalhamento.by-contract.json')
const atrasoFixture = readFixture<{ ParcelasEmAtraso: ParcelaEmAtrasoLegacy[] }>('atraso.by-contract.json')
const parametrosFixture = readFixture<{ LinhasDeEmprestimo: LinhaDeCreditoLegacy[] }>('simulacao.parametros.json')
const primeiroVencFixture = readFixture<DataVencimentoLegacy>('simulacao.primeiro-vencimento.json')
const multiplasFixture = readFixture<{ PrevisoesDeParcelas: EmprestimoSimuladoLegacy[] }>('simulacao.multiplas.json')
const termoPropostaFixture = readFixture<TermoLegacy>('termo.proposta-web.json')
const termoCompartFixture = readFixture<TermoLegacy>('termo.compartilhamento.json')
const termoCadastraisFixture = readFixture<TermoLegacy>('termo.dados-cadastrais.json')
const dataprevFixture = readFixture<DadosTrabalhadorLegacy>('dataprev.dados-trabalhador.json')
const propostaInsertFixture = readFixture<{ numeroDoContrato: string }>('propostas.insert.json')

const ANO_FIXTURE_PROPOSTA = 2026
const PRIMEIRO_NUMERO_PROPOSTA_GERADA = 102
const FIXTURE_OWNER = 'user1'

export function isFixtureOwner(owner: string): boolean {
  return owner === FIXTURE_OWNER
}

let proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
let propostasEmMemoria: Array<{ owner: string; proposta: PropostaLegacy }> = propostasListFixture.map((proposta) => ({
  owner: FIXTURE_OWNER,
  proposta: clonarProposta(proposta),
}))

function clonarProposta(proposta: PropostaLegacy): PropostaLegacy {
  return { ...proposta, StatusDaProposta: { ...proposta.StatusDaProposta } }
}

function gerarNumeroProposta(): string {
  const numero = String(proximoNumeroProposta).padStart(4, '0')
  proximoNumeroProposta += 1
  return `PRP-${ANO_FIXTURE_PROPOSTA}-${numero}`
}

export function resetPropostasEmMemoria(): void {
  proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
  propostasEmMemoria = propostasListFixture.map((proposta) => ({ owner: FIXTURE_OWNER, proposta: clonarProposta(proposta) }))
}

export function listarContratos(owner: string): ContratoLegacy[] {
  return owner === FIXTURE_OWNER ? contratosList : []
}

export function obterContrato(owner: string, id: string): ContratoLegacy | undefined {
  if (owner !== FIXTURE_OWNER || !contratosList.some((contrato) => contrato.Contrato === id)) return undefined
  return id === contratosDetail.Contrato ? contratosDetail : contratosList.find((contrato) => contrato.Contrato === id)
}

export function podeAcessarContrato(owner: string, id: string): boolean {
  return owner === FIXTURE_OWNER && contratosList.some((contrato) => contrato.Contrato === id)
}

export function listarPropostas(owner: string): PropostaLegacy[] {
  return propostasEmMemoria.filter((item) => item.owner === owner).map((item) => clonarProposta(item.proposta))
}

export function excluirProposta(owner: string, id: string): boolean {
  const totalAntes = propostasEmMemoria.length
  propostasEmMemoria = propostasEmMemoria.filter((item) => item.owner !== owner || item.proposta.Contrato !== id)
  return propostasEmMemoria.length !== totalAntes
}

export function criarProposta(owner: string, body: PropostaMockInput): PropostaLegacy {
  const linha = parametrosFixture.LinhasDeEmprestimo.find((item) => item.CodigoDaLinha === body.LinhaCredito)
  const valorLiquido = Number(body.ValorLiquido) || 0

  const proposta: PropostaLegacy = {
    Contrato: gerarNumeroProposta(),
    DescricaoDaLinha: linha?.DescricaoDaLinha ?? `Linha ${body.LinhaCredito}`,
    TaxaDeJuros: linha?.PercentualDaTaxaJuros ?? 0,
    DataDeEmissao: body.DataLiberacao != null ? `${body.DataLiberacao}T12:00:00` : new Date().toISOString(),
    ValorBruto: Number((valorLiquido * 1.08).toFixed(2)),
    ValorLiquido: valorLiquido,
    NumeroDeParcelas: Number(body.NumeroParcelas) || 1,
    StatusDaProposta: { Value: 'Pendente' },
  }
  propostasEmMemoria = [{ owner, proposta }, ...propostasEmMemoria]
  return proposta
}

export function respostaInsercaoProposta(numeroDoContrato: string): { numeroDoContrato: string } {
  return { ...propostaInsertFixture, numeroDoContrato }
}

export function obterExtrato(): MovimentoLegacy[] {
  return extratoFixture.MovimentoDeEmprestimo ?? []
}

export function obterPrevisao(): ParcelaPrevistaLegacy[] {
  return previsaoFixture.Parcelas
}

export function obterDetalhamento(): ParcelaDetalheLegacy[] {
  return detalhamentoFixture
}

export function obterAtraso(): ParcelaEmAtrasoLegacy[] {
  return atrasoFixture.ParcelasEmAtraso
}

export function obterParametrosSimulacao(): LinhaDeCreditoLegacy[] {
  return parametrosFixture.LinhasDeEmprestimo
}

export function obterPrimeiroVencimento(): DataVencimentoLegacy {
  return primeiroVencFixture
}

export function simularMultiplas(): EmprestimoSimuladoLegacy[] {
  return multiplasFixture.PrevisoesDeParcelas
}

export function obterTermo(
  tipo: 'PropostaWeb' | 'AutorizacaoConsultaDadosDoTrabalhador' | 'CONSENTIMENTO_DADOS_CADASTRAIS',
): TermoLegacy {
  if (tipo === 'AutorizacaoConsultaDadosDoTrabalhador') return termoCompartFixture
  if (tipo === 'CONSENTIMENTO_DADOS_CADASTRAIS') return termoCadastraisFixture
  return termoPropostaFixture
}

export function preencherVariaveis(): string {
  return 'Texto do termo preenchido.'
}

export function assinarTermo(): boolean {
  return true
}

export function obterDadosTrabalhador(): DadosTrabalhadorLegacy {
  return dataprevFixture
}
