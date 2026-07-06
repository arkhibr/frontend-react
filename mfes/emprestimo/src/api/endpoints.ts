import { createHttpClient } from './httpClient'
import type { MfeMountContext } from '../contract'
import type {
  Contrato, Proposta, Movimento, ParcelaPrevista, ParcelaDetalhe, ParcelaAtraso,
  LinhaDeCredito, EmprestimoSimulado, TermoConsentimento, DadosTrabalhador,
  DataVencimentoContratosAptos, SolicitacaoDeProposta, PropostaEnviada,
  SimulacaoRequest, AssinarTermoRequest,
} from '../domain'

export function createApi(ctx: MfeMountContext) {
  const client = createHttpClient(ctx)
  const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) })
  return {
    listarContratos: () => client<Contrato[]>('/contratos'),
    obterContrato: (id: string) => client<Contrato>(`/contratos/${id}`),
    listarPropostas: () => client<Proposta[]>('/propostas'),
    excluirProposta: (id: string) =>
      client<boolean>(`/propostas/${id}`, { method: 'DELETE' }),
    obterExtrato: (id: string, di: string, df: string) =>
      client<Movimento[]>(`/contratos/${id}/extrato?inicio=${di}&fim=${df}`),
    obterPrevisao: (id: string) =>
      client<ParcelaPrevista[]>(`/contratos/${id}/previsao`),
    obterDetalhamento: (id: string) =>
      client<ParcelaDetalhe[]>(`/contratos/${id}/parcelas`),
    obterAtraso: (id: string) =>
      client<ParcelaAtraso[]>(`/contratos/${id}/atraso`),
    obterParametrosSimulacao: () =>
      client<LinhaDeCredito[]>('/simulacao/parametros'),
    obterPrimeiroVencimento: (cl: number, tv: number, dv: number, dl: string, dr: string) =>
      client<DataVencimentoContratosAptos>(
        `/simulacao/primeiro-vencimento?cl=${cl}&tv=${tv}&dv=${dv}&dl=${dl}&dr=${dr}`),
    simularMultiplas: (body: SimulacaoRequest) =>
      client<EmprestimoSimulado[]>('/simulacao/multiplas', post(body)),
    obterTermo: (tipo: 'PropostaWeb' | 'AutorizacaoConsultaDadosDoTrabalhador' | 'CONSENTIMENTO_DADOS_CADASTRAIS') =>
      client<TermoConsentimento>(`/termos/${tipo}`),
    preencherVariaveis: (body: TermoConsentimento) =>
      client<string>('/termos/preencher-variaveis', post(body)),
    assinarTermo: (body: AssinarTermoRequest) =>
      client<boolean>('/termos/assinar', post(body)),
    obterDadosTrabalhador: () =>
      client<DadosTrabalhador>('/dados-trabalhador'),
    enviarProposta: (body: SolicitacaoDeProposta) =>
      client<PropostaEnviada>('/propostas', post(body)),
  }
}

export type EmprestimoApi = ReturnType<typeof createApi>
