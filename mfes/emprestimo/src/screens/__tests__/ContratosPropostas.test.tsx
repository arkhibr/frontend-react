import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContratosPropostas } from '../ContratosPropostas'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

function stubFetch(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const key = Object.keys(map).find((k) => url.includes(k))
    return new Response(JSON.stringify(key ? map[key] : []))
  }))
}

describe('ContratosPropostas', () => {
  it('mostra o header de imediato e lista contratos após carregar', async () => {
    stubFetch({ '/contratos': [{ Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal',
      CodigoDaLinha: 101, ValorLiberado: 15000, ValorBruto: 16250, SaldoAtual: 9245.5,
      NumeroDeParcelas: 24, ParcelasRestantes: 14, TaxaDeJuros: 1.89, TemParcelasEmAtraso: false }] })
    const ir = vi.fn()
    render(<ContratosPropostas api={createApi(ctx)} ir={ir} />)
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('123456-7')).toBeInTheDocument())
  })

  it('clicar num contrato navega para o detalhe', async () => {
    stubFetch({ '/contratos': [{ Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal',
      CodigoDaLinha: 101, ValorLiberado: 15000, ValorBruto: 16250, SaldoAtual: 9245.5,
      NumeroDeParcelas: 24, ParcelasRestantes: 14, TaxaDeJuros: 1.89 }] })
    const ir = vi.fn()
    render(<ContratosPropostas api={createApi(ctx)} ir={ir} />)
    await userEvent.click(await screen.findByText('123456-7'))
    expect(ir).toHaveBeenCalledWith({ tela: 'emprestimo-contrato', contrato: '123456-7' })
  })
})
