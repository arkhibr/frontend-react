import { http, HttpResponse } from 'msw'
import contratosList from '../fixtures/emprestimo/contratos.list.json'
import contratosDetail from '../fixtures/emprestimo/contratos.detail.json'
import propostasList from '../fixtures/emprestimo/propostas.list.json'
import extrato from '../fixtures/emprestimo/extrato.by-period.json'
import previsao from '../fixtures/emprestimo/previsao.by-contract.json'
import detalhamento from '../fixtures/emprestimo/detalhamento.by-contract.json'
import atraso from '../fixtures/emprestimo/atraso.by-contract.json'
import parametros from '../fixtures/emprestimo/simulacao.parametros.json'
import primeiroVenc from '../fixtures/emprestimo/simulacao.primeiro-vencimento.json'
import multiplas from '../fixtures/emprestimo/simulacao.multiplas.json'
import termoProposta from '../fixtures/emprestimo/termo.proposta-web.json'
import termoCompart from '../fixtures/emprestimo/termo.compartilhamento.json'
import termoCadastrais from '../fixtures/emprestimo/termo.dados-cadastrais.json'
import dataprev from '../fixtures/emprestimo/dataprev.dados-trabalhador.json'
import propostaInsert from '../fixtures/emprestimo/propostas.insert.json'

// ---------------------------------------------------------------------------
// Contrato limpo (camelCase) — espelha mfes/emprestimo/src/domain/index.ts.
// Não importado de lá (pacote separado): só usado aqui como guia de nomes.
// ---------------------------------------------------------------------------

interface Contrato {
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

interface Proposta {
  numero: string
  linhaDeCredito: string
  taxaDeJuros: number
  dataDeEmissao: string
  valorBruto: number
  valorLiquido: number
  parcelas: number
  status: string
}

interface Movimento {
  tipo: 'Credito' | 'Debito'
  data: string
  historico: string
  valor: number
  saldo: number
}

interface ParcelaPrevista {
  numero: number
  vencimento: string
  prestacao: number
  saldoAtual: number
}

interface ParcelaDetalhe {
  numero: number
  vencimento: string
  prestacao: number
  status: string
}

interface ParcelaAtraso {
  contrato: string
  vencimento: string
  valorPrestacao: number
  saldoAtual: number
  proximoVencimento: string
}

interface LinhaDeCredito {
  id: number
  descricao: string
  numeroMinimoDeParcelas: number
  numeroMaximoDeParcelas: number
  valorMinimo: number
  valorMaximo: number
  percentualTaxaJuros: number
  creditoTrabalhador: boolean
}

interface EmprestimoSimulado {
  parcelas: number
  valorBruto: number
  valorLiquido: number
  cet: number
  cetAnual: number
  totalDasParcelas: number
}

interface TermoConsentimento {
  versaoDoTermo?: number
  tipoDoTermo?: string
  textoDoTermo?: string
  variaveisDosTermos?: unknown
}

interface DadosTrabalhador {
  possuiAutorizacaoParaConsulta?: boolean
  valorBaseMargem?: number
  valorMargemDisponivel?: number
}

interface DataVencimentoContratosAptos {
  dataDeVencimentoInicial?: string
  contratosAptosAoRefinanciamento?: unknown[]
}

// ---------------------------------------------------------------------------
// Formato das fixtures (legado, PascalCase) — só o suficiente para tipar o
// acesso aos campos usados nas funções de mapeamento abaixo.
// ---------------------------------------------------------------------------

interface ContratoFixture {
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

interface PropostaFixture {
  Contrato: string
  DescricaoDaLinha: string
  TaxaDeJuros: number
  DataDeEmissao: string
  ValorBruto: number
  ValorLiquido: number
  NumeroDeParcelas: number
  StatusDaProposta: { Key?: string; Value?: string }
}

interface MovimentoFixture {
  TipoLancamento: 'Credito' | 'Debito'
  Data: string
  Historico: string
  Valor: number
  Saldo: number
}

interface ParcelaPrevistaFixture {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaPrestacao: number
  ValorDoSaldoAtual: number
}

interface ParcelaDetalheFixture {
  NumeroDaParcela: number
  DataDeVencimento: string
  ValorDaPrestacao: number
  StatusDaParcela?: string
}

interface ParcelaAtrasoFixture {
  NumeroDoContrato: string
  VencimentoDaParcela: string
  ValorDaPrestacao: number
  ValorDoSaldoAtual: number
  DataDoProximoVencimento: string
}

interface LinhaDeCreditoFixture {
  CodigoDaLinha: number
  DescricaoDaLinha: string
  NumeroMinimoDeParcelas: number
  NumeroMaximoDeParcelas: number
  ValorMinimo: number
  ValorMaximo: number
  PercentualDaTaxaJuros: number
  CreditoDoTrabalhador?: boolean
}

interface EmprestimoSimuladoFixture {
  NumeroDeParcelas: number
  ValorBruto: number
  ValorLiquido: number
  CET: number
  CET_ANUAL: number
  TotalDoValorDasParcelas: number
}

interface TermoFixture {
  VersaoDoTermo?: number
  TipoDoTermo?: string
  TextoDoTermo?: string
  VariaveisDosTermos?: unknown
}

interface DadosTrabalhadorFixture {
  PossuiAutorizacaoParaConsulta?: boolean
  ValorBaseMargem?: number
  ValorMargemDisponivel?: number
}

interface DataVencimentoFixture {
  DataDeVencimentoInicial?: string
  ContratosAptosAoRefinanciamento?: unknown[]
}

// Corpo aceito por POST /propostas — já no formato limpo (camelCase) que o
// cliente do MFE efetivamente envia (ver SolicitacaoDeProposta em domain/index.ts).
interface SolicitacaoDePropostaBody {
  valorLiquido: number
  numeroParcelas: number
  linhaCredito: number
  dataLiberacao?: string
  observacao?: string
}

// ---------------------------------------------------------------------------
// Mapeamento fixture (PascalCase) -> formato limpo (camelCase), em um único
// passo — sem tipo legado intermediário (diferente de bffs/emprestimo, que
// separa em legacyBackend.ts + transform.ts).
// ---------------------------------------------------------------------------

function toContrato(d: ContratoFixture): Contrato {
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

function toProposta(d: PropostaFixture): Proposta {
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

function toMovimento(d: MovimentoFixture): Movimento {
  return { tipo: d.TipoLancamento, data: d.Data, historico: d.Historico, valor: d.Valor, saldo: d.Saldo }
}

function toParcelaPrevista(d: ParcelaPrevistaFixture): ParcelaPrevista {
  return {
    numero: d.NumeroDaParcela,
    vencimento: d.DataDeVencimento,
    prestacao: d.ValorDaPrestacao,
    saldoAtual: d.ValorDoSaldoAtual,
  }
}

function toParcelaDetalhe(d: ParcelaDetalheFixture): ParcelaDetalhe {
  return {
    numero: d.NumeroDaParcela,
    vencimento: d.DataDeVencimento,
    prestacao: d.ValorDaPrestacao,
    status: d.StatusDaParcela ?? '—',
  }
}

function toParcelaAtraso(d: ParcelaAtrasoFixture): ParcelaAtraso {
  return {
    contrato: d.NumeroDoContrato,
    vencimento: d.VencimentoDaParcela,
    valorPrestacao: d.ValorDaPrestacao,
    saldoAtual: d.ValorDoSaldoAtual,
    proximoVencimento: d.DataDoProximoVencimento,
  }
}

function toLinhaDeCredito(d: LinhaDeCreditoFixture): LinhaDeCredito {
  return {
    id: d.CodigoDaLinha,
    descricao: d.DescricaoDaLinha,
    numeroMinimoDeParcelas: d.NumeroMinimoDeParcelas,
    numeroMaximoDeParcelas: d.NumeroMaximoDeParcelas,
    valorMinimo: d.ValorMinimo,
    valorMaximo: d.ValorMaximo,
    percentualTaxaJuros: d.PercentualDaTaxaJuros,
    creditoTrabalhador: d.CreditoDoTrabalhador ?? false,
  }
}

function toEmprestimoSimulado(d: EmprestimoSimuladoFixture): EmprestimoSimulado {
  return {
    parcelas: d.NumeroDeParcelas,
    valorBruto: d.ValorBruto,
    valorLiquido: d.ValorLiquido,
    cet: d.CET,
    cetAnual: d.CET_ANUAL,
    totalDasParcelas: d.TotalDoValorDasParcelas,
  }
}

function toTermoConsentimento(d: TermoFixture): TermoConsentimento {
  return {
    versaoDoTermo: d.VersaoDoTermo,
    tipoDoTermo: d.TipoDoTermo,
    textoDoTermo: d.TextoDoTermo,
    variaveisDosTermos: d.VariaveisDosTermos,
  }
}

function toDadosTrabalhador(d: DadosTrabalhadorFixture): DadosTrabalhador {
  return {
    possuiAutorizacaoParaConsulta: d.PossuiAutorizacaoParaConsulta,
    valorBaseMargem: d.ValorBaseMargem,
    valorMargemDisponivel: d.ValorMargemDisponivel,
  }
}

function toDataVencimentoContratosAptos(d: DataVencimentoFixture): DataVencimentoContratosAptos {
  return {
    dataDeVencimentoInicial: d.DataDeVencimentoInicial,
    contratosAptosAoRefinanciamento: d.ContratosAptosAoRefinanciamento,
  }
}

// ---------------------------------------------------------------------------
// Estado em memória de propostas — já no formato limpo.
// ---------------------------------------------------------------------------

const ANO_FIXTURE_PROPOSTA = 2026
const PRIMEIRO_NUMERO_PROPOSTA_GERADA = 102

let proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
let propostasEmMemoria: Proposta[] = propostasList.map(toProposta)

function gerarNumeroProposta(): string {
  const numero = String(proximoNumeroProposta).padStart(4, '0')
  proximoNumeroProposta += 1
  return `PRP-${ANO_FIXTURE_PROPOSTA}-${numero}`
}

function criarProposta(body: SolicitacaoDePropostaBody): Proposta {
  const linha = parametros.LinhasDeEmprestimo.find((item) => item.CodigoDaLinha === body.linhaCredito)
  const valorLiquido = Number(body.valorLiquido) || 0
  const parcelas = Number(body.numeroParcelas) || 1

  return {
    numero: gerarNumeroProposta(),
    linhaDeCredito: linha?.DescricaoDaLinha ?? `Linha ${body.linhaCredito}`,
    taxaDeJuros: linha?.PercentualDaTaxaJuros ?? 0,
    dataDeEmissao: body.dataLiberacao != null ? `${body.dataLiberacao}T12:00:00` : new Date().toISOString(),
    valorBruto: Number((valorLiquido * 1.08).toFixed(2)),
    valorLiquido,
    parcelas,
    status: 'Pendente',
  }
}

export function resetEmprestimoMemoria(): void {
  proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
  propostasEmMemoria = propostasList.map(toProposta)
}

// ---------------------------------------------------------------------------
// Handlers — contrato limpo, sem prefixo (modo MSW: httpClient não adiciona
// /bff/emprestimo quando apiUrl está vazio).
// ---------------------------------------------------------------------------

export const emprestimoHandlers = [
  http.get('/contratos', () => HttpResponse.json(contratosList.map(toContrato))),

  http.get('/contratos/:id', () => HttpResponse.json(toContrato(contratosDetail))),

  http.get('/propostas', () => HttpResponse.json(propostasEmMemoria)),

  http.delete('/propostas/:id', ({ params }) => {
    const numero = String(params.id)
    const totalAntes = propostasEmMemoria.length
    propostasEmMemoria = propostasEmMemoria.filter((proposta) => proposta.numero !== numero)
    return HttpResponse.json(propostasEmMemoria.length !== totalAntes)
  }),

  http.get('/contratos/:id/extrato', () =>
    HttpResponse.json((extrato.MovimentoDeEmprestimo ?? []).map(toMovimento))),

  http.get('/contratos/:id/previsao', () =>
    HttpResponse.json(previsao.Parcelas.map(toParcelaPrevista))),

  http.get('/contratos/:id/parcelas', () =>
    HttpResponse.json(detalhamento.map(toParcelaDetalhe))),

  http.get('/contratos/:id/atraso', () =>
    HttpResponse.json(atraso.ParcelasEmAtraso.map(toParcelaAtraso))),

  http.get('/simulacao/parametros', () =>
    HttpResponse.json(parametros.LinhasDeEmprestimo.map(toLinhaDeCredito))),

  http.get('/simulacao/primeiro-vencimento', () =>
    HttpResponse.json(toDataVencimentoContratosAptos(primeiroVenc))),

  http.post('/simulacao/multiplas', () =>
    HttpResponse.json(multiplas.PrevisoesDeParcelas.map(toEmprestimoSimulado))),

  http.get('/termos/:tipo', ({ params }) => {
    const tipo = String(params.tipo)
    const fixture = tipo === 'AutorizacaoConsultaDadosDoTrabalhador'
      ? termoCompart
      : tipo === 'CONSENTIMENTO_DADOS_CADASTRAIS'
        ? termoCadastrais
        : termoProposta
    return HttpResponse.json(toTermoConsentimento(fixture))
  }),

  http.post('/termos/preencher-variaveis', () => HttpResponse.json('Texto do termo preenchido.')),

  http.post('/termos/assinar', () => HttpResponse.json(true)),

  http.get('/dados-trabalhador', () => HttpResponse.json(toDadosTrabalhador(dataprev))),

  http.post('/propostas', async ({ request }) => {
    const body = await request.json() as SolicitacaoDePropostaBody
    const proposta = criarProposta(body)
    propostasEmMemoria = [proposta, ...propostasEmMemoria]
    return HttpResponse.json({ ...propostaInsert, numeroDoContrato: proposta.numero })
  }),
]
