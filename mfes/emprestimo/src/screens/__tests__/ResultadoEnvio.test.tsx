import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ResultadoEnvio } from '../ResultadoEnvio'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

const sim = {
  estado: { passo: 'resultado' as const, linha: { id: 205, descricao: 'Refin', creditoTrabalhador: false,
    numeroMinimoDeParcelas: 12, numeroMaximoDeParcelas: 48, valorMinimo: 3000, valorMaximo: 50000,
    percentualTaxaJuros: 1.39 }, valorLiquido: 10000, parcelas: 24 },
  escolherLinha: vi.fn(), definirValores: vi.fn(), irPara: vi.fn(),
}

function stub(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const k = Object.keys(map).find((key) => url.includes(key))
    return new Response(JSON.stringify(k ? map[k] : {}))
  }))
}

describe('ResultadoEnvio', () => {
  it('simula e mostra a CET do cenário', async () => {
    stub({ 'MultiplasSimulacoes': { PrevisoesDeParcelas: [{ NumeroDeParcelas: 24, ValorLiquido: 10000,
      ValorBruto: 11250, CET: 1.74, CET_ANUAL: 23.01, TotalDoValorDasParcelas: 15480, Parcelas: [] }] } })
    render(<ResultadoEnvio api={createApi(ctx)} sim={sim} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/1\.74/)).toBeInTheDocument())
  })
})
