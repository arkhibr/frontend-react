import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Contrato } from '../Contrato'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

describe('Contrato', () => {
  it('carrega o contrato e navega para o extrato', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal', CodigoDaLinha: 101,
      ValorLiberado: 15000, ValorBruto: 16250, SaldoAtual: 9245.5, NumeroDeParcelas: 24,
      ParcelasRestantes: 14, TaxaDeJuros: 1.89, TaxaDaCETMensal: 2.11, TaxaDaCETAnual: 28.7,
    }))))
    const ir = vi.fn()
    render(<Contrato api={createApi(ctx)} contrato="123456-7" ir={ir} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Crédito Pessoal/)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Ver extrato/i }))
    expect(ir).toHaveBeenCalledWith({ tela: 'emprestimo-extrato', contrato: '123456-7' })
  })
})
