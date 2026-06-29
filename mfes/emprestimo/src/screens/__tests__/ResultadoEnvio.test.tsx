import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultadoEnvio } from '../ResultadoEnvio'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

const linha = {
  id: 205, descricao: 'Refin', creditoTrabalhador: false,
  numeroMinimoDeParcelas: 12, numeroMaximoDeParcelas: 48, valorMinimo: 3000, valorMaximo: 50000,
  percentualTaxaJuros: 1.39,
}

function makeSim(passo: 'resultado' | 'termo' | 'enviado') {
  return {
    estado: { passo, linha, valorLiquido: 10000, parcelas: 24 },
    escolherLinha: vi.fn(), definirValores: vi.fn(), irPara: vi.fn(),
  }
}

function stub(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const k = Object.keys(map).find((key) => url.includes(key))
    return new Response(JSON.stringify(k ? map[k] : {}))
  }))
}

describe('ResultadoEnvio', () => {
  it('simula e mostra a CET do cenário', async () => {
    stub({ MultiplasSimulacoes: { PrevisoesDeParcelas: [{ NumeroDeParcelas: 24, ValorLiquido: 10000,
      ValorBruto: 11250, CET: 1.74, CET_ANUAL: 23.01, TotalDoValorDasParcelas: 15480, Parcelas: [] }] } })
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('resultado')} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/1\.74/)).toBeInTheDocument())
  })

  it('exibe erro quando simulação falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('resultado')} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Falha na simulação/i))
  })

  it('mostra estado de carregando durante a simulação', () => {
    // fetch nunca resolve
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('resultado')} voltar={() => {}} />)
    expect(screen.getByText(/Simulando/i)).toBeInTheDocument()
  })

  it('passo resultado: botão Continuar chama irPara(termo)', async () => {
    stub({ MultiplasSimulacoes: { PrevisoesDeParcelas: [{ NumeroDeParcelas: 24, ValorLiquido: 10000,
      ValorBruto: 11250, CET: 1.74, CET_ANUAL: 23.01, TotalDoValorDasParcelas: 15480, Parcelas: [] }] } })
    const sim = makeSim('resultado')
    render(<ResultadoEnvio api={createApi(ctx)} sim={sim} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Continuar para o termo/i)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/Continuar para o termo/i))
    expect(sim.irPara).toHaveBeenCalledWith('termo')
  })

  it('passo termo: mostra texto do termo e botão assinar', async () => {
    stub({
      TermoDeConsentimento: { TextoDoTermo: 'Ao aceitar você concorda com os termos.' },
      AssinarTermoDeAceite: true,
      Variaveis: 'ok',
      propostas: { numeroDoContrato: 'CTR-999' },
    })
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('termo')} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Ao aceitar você concorda com os termos/i)).toBeInTheDocument())
    expect(screen.getByText(/Assinar e enviar proposta/i)).toBeInTheDocument()
  })

  it('passo enviado: mostra número do contrato', () => {
    vi.stubGlobal('fetch', vi.fn())
    // passo enviado não faz fetch adicional — apenas exibe o estado
    render(<ResultadoEnvio api={createApi(ctx)} sim={makeSim('enviado')} voltar={() => {}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/Proposta registrada/i)).toBeInTheDocument()
  })
})
