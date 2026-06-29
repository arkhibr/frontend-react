import { createHttpClient } from './httpClient'
import type { MfeMountContext } from '../contract'
import type {
  ContratoDto, PropostaDto, EmprestimoExtratoDto, PrevisaoDeParcelasDto,
  ParcelaDetalheDto, EmprestimoEmAtrasoDto, ParametrosParaSimulacaoDto,
  EmprestimosSimuladosDto, SimulacaoDeEmprestimoDto, TermoConsentimentoDto,
  DadosTrabalhadorDataPrevDto, InsercaoDePropostaResponse, SolicitacaoDePropostaDto,
  DataDeVencimentoEContratosAptosDto,
} from '../dto'

export function createApi(ctx: MfeMountContext) {
  const client = createHttpClient(ctx)
  const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) })
  return {
    listarContratos: () => client<ContratoDto[]>('/emprestimo.svc/contratos'),
    obterContrato: (id: string) => client<ContratoDto>(`/emprestimo.svc/contratos/${id}`),
    listarPropostas: () => client<PropostaDto[]>('/emprestimo.svc/propostas'),
    excluirProposta: (id: string) =>
      client<boolean>(`/emprestimo.svc/propostas/${id}`, { method: 'DELETE' }),
    obterExtrato: (id: string, di: string, df: string) =>
      client<EmprestimoExtratoDto>(`/Emprestimo.svc/ObterExtratoEmprestimo/${id}/${di}/${df}`),
    obterPrevisao: (id: string) =>
      client<PrevisaoDeParcelasDto>(`/emprestimo.svc/obterprevisaodecontratoemandamento/${id}`),
    obterDetalhamento: (id: string) =>
      client<ParcelaDetalheDto[]>(`/emprestimo.svc/detalhamentodeparcelas/${id}`),
    obterAtraso: (id: string) =>
      client<EmprestimoEmAtrasoDto>(`/emprestimo.svc/obterparcelasematrasodocontrato/${id}`),
    obterParametrosSimulacao: () =>
      client<ParametrosParaSimulacaoDto>('/emprestimo.svc/simulacao'),
    obterPrimeiroVencimento: (cl: number, tv: number, dv: number, dl: string, dr: string) =>
      client<DataDeVencimentoEContratosAptosDto>(
        `/emprestimo.svc/simulacao/${cl}/${tv}/${dv}/${dl}/${dr}`),
    simularMultiplas: (body: SimulacaoDeEmprestimoDto) =>
      client<EmprestimosSimuladosDto>('/emprestimo.svc/MultiplasSimulacoes', post(body)),
    obterTermo: (tipo: 'PropostaWeb' | 'AutorizacaoConsultaDadosDoTrabalhador' | 'CONSENTIMENTO_DADOS_CADASTRAIS') =>
      client<TermoConsentimentoDto>(`/TermoDeAceite.svc/TermoDeConsentimento/${tipo}`),
    preencherVariaveis: (body: TermoConsentimentoDto) =>
      client<string>('/TermoDeAceite.svc/TermoDeConsentimento/Variaveis/Substituir', post(body)),
    assinarTermo: (body: { TipoDoTermoDeAceite: string; SistemaDeOrigem: string }) =>
      client<boolean>('/TermoDeAceite.svc/AssinarTermoDeAceite', post(body)),
    obterDadosTrabalhador: () =>
      client<DadosTrabalhadorDataPrevDto>('/emprestimo.svc/dados-trabalhador-dataprev'),
    enviarProposta: (body: SolicitacaoDePropostaDto) =>
      client<InsercaoDePropostaResponse>('/emprestimo.svc/propostas/object', post(body)),
  }
}

export type EmprestimoApi = ReturnType<typeof createApi>
