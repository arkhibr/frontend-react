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
    stubFetch({ '/contratos': [{ numero: '123456-7', linhaDeCredito: 'Crédito Pessoal',
      valorLiberado: 15000, saldoAtual: 9245.5, parcelas: 24, parcelasRestantes: 14,
      taxaDeJuros: 1.89, cetMensal: 0, cetAnual: 0, temAtraso: false, proximaParcela: null }] })
    const ir = vi.fn()
    render(<ContratosPropostas api={createApi(ctx)} ir={ir} />)
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('123456-7')).toBeInTheDocument())
  })

  it('clicar num contrato navega para o detalhe', async () => {
    stubFetch({ '/contratos': [{ numero: '123456-7', linhaDeCredito: 'Crédito Pessoal',
      valorLiberado: 15000, saldoAtual: 9245.5, parcelas: 24, parcelasRestantes: 14,
      taxaDeJuros: 1.89, cetMensal: 0, cetAnual: 0, temAtraso: false, proximaParcela: null }] })
    const ir = vi.fn()
    render(<ContratosPropostas api={createApi(ctx)} ir={ir} />)
    await userEvent.click(await screen.findByText('123456-7'))
    expect(ir).toHaveBeenCalledWith({ tela: 'emprestimo-contrato', contrato: '123456-7' })
  })

  it('mostra alerta de erro na aba Propostas quando o fetch falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/propostas')) return new Response('{}', { status: 500 })
      return new Response(JSON.stringify([]))
    }))
    render(<ContratosPropostas api={createApi(ctx)} ir={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /Propostas/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Não foi possível carregar as propostas/i))
  })
})
