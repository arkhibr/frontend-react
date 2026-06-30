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

interface PropostaMock {
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
  CadastradaNaWeb?: boolean
}

interface SolicitacaoPropostaMock {
  ValorLiquido: number
  NumeroParcelas: number
  LinhaCredito: number
  DataLiberacao?: string
  Observacao?: string
}

const ANO_FIXTURE_PROPOSTA = 2026
const PRIMEIRO_NUMERO_PROPOSTA_GERADA = 102

let proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
let propostasEmMemoria: PropostaMock[] = propostasList.map(clonarProposta)

function clonarProposta(proposta: PropostaMock): PropostaMock {
  return {
    ...proposta,
    StatusDaProposta: { ...proposta.StatusDaProposta },
  }
}

function gerarNumeroProposta(): string {
  const numero = String(proximoNumeroProposta).padStart(4, '0')
  proximoNumeroProposta += 1
  return `PRP-${ANO_FIXTURE_PROPOSTA}-${numero}`
}

function criarProposta(body: SolicitacaoPropostaMock): PropostaMock {
  const linha = parametros.LinhasDeEmprestimo.find(
    (item) => item.CodigoDaLinha === body.LinhaCredito,
  )
  const valorLiquido = Number(body.ValorLiquido) || 0
  const parcelas = Number(body.NumeroParcelas) || 1

  return {
    Contrato: gerarNumeroProposta(),
    CodigoDaLinha: body.LinhaCredito,
    DescricaoDaLinha: linha?.DescricaoDaLinha ?? `Linha ${body.LinhaCredito}`,
    TaxaDeJuros: linha?.PercentualDaTaxaJuros ?? 0,
    DataDeEmissao: body.DataLiberacao != null ? `${body.DataLiberacao}T12:00:00` : new Date().toISOString(),
    ValorBruto: Number((valorLiquido * 1.08).toFixed(2)),
    ValorLiquido: valorLiquido,
    NumeroDeParcelas: parcelas,
    ValorPrevistoDaPrimeiraParcela: Number((valorLiquido / parcelas).toFixed(2)),
    StatusDaProposta: { Key: 'P', Value: 'Pendente' },
    Observacao: body.Observacao,
    CadastradaNaWeb: true,
  }
}

export function resetEmprestimoMemoria(): void {
  proximoNumeroProposta = PRIMEIRO_NUMERO_PROPOSTA_GERADA
  propostasEmMemoria = propostasList.map(clonarProposta)
}

export const emprestimoHandlers = [
  http.get('/emprestimo.svc/contratos', () => HttpResponse.json(contratosList)),
  http.get('/emprestimo.svc/contratos/:id', () => HttpResponse.json(contratosDetail)),
  http.get('/emprestimo.svc/propostas', () => HttpResponse.json(propostasEmMemoria.map(clonarProposta))),
  http.delete('/emprestimo.svc/propostas/:id', ({ params }) => {
    const contrato = String(params.id)
    const totalAntes = propostasEmMemoria.length
    propostasEmMemoria = propostasEmMemoria.filter((proposta) => proposta.Contrato !== contrato)
    return HttpResponse.json(propostasEmMemoria.length !== totalAntes)
  }),
  http.get('/Emprestimo.svc/ObterExtratoEmprestimo/:id/:di/:df', () => HttpResponse.json(extrato)),
  http.get('/emprestimo.svc/obterprevisaodecontratoemandamento/:id', () => HttpResponse.json(previsao)),
  http.get('/emprestimo.svc/detalhamentodeparcelas/:id', () => HttpResponse.json(detalhamento)),
  http.get('/emprestimo.svc/obterparcelasematrasodocontrato/:id', () => HttpResponse.json(atraso)),
  http.get('/emprestimo.svc/simulacao', () => HttpResponse.json(parametros)),
  http.get('/emprestimo.svc/simulacao/:cl/:tv/:dv/:dl/:dr', () => HttpResponse.json(primeiroVenc)),
  http.post('/emprestimo.svc/MultiplasSimulacoes', () => HttpResponse.json(multiplas)),
  http.get('/TermoDeAceite.svc/TermoDeConsentimento/PropostaWeb', () => HttpResponse.json(termoProposta)),
  http.get('/TermoDeAceite.svc/TermoDeConsentimento/AutorizacaoConsultaDadosDoTrabalhador', () => HttpResponse.json(termoCompart)),
  http.get('/TermoDeAceite.svc/TermoDeConsentimento/CONSENTIMENTO_DADOS_CADASTRAIS', () => HttpResponse.json(termoCadastrais)),
  http.post('/TermoDeAceite.svc/TermoDeConsentimento/Variaveis/Substituir', () => HttpResponse.json('Texto do termo preenchido.')),
  http.post('/TermoDeAceite.svc/AssinarTermoDeAceite', () => HttpResponse.json(true)),
  http.get('/emprestimo.svc/dados-trabalhador-dataprev', () => HttpResponse.json(dataprev)),
  http.post('/emprestimo.svc/propostas/object', async ({ request }) => {
    const body = await request.json() as SolicitacaoPropostaMock
    const proposta = criarProposta(body)
    propostasEmMemoria = [proposta, ...propostasEmMemoria]
    return HttpResponse.json({ ...propostaInsert, numeroDoContrato: proposta.Contrato })
  }),
]
