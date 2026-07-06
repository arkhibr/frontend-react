import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Simulador } from '../Simulador'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

const linhas = [{ id: 205, descricao: 'Refinanciamento Consignado', numeroMinimoDeParcelas: 12,
  numeroMaximoDeParcelas: 48, valorMinimo: 3000, valorMaximo: 50000, percentualTaxaJuros: 1.39, creditoTrabalhador: true }]

describe('Simulador (parâmetros + valores)', () => {
  it('carrega parâmetros e mostra as linhas de crédito disponíveis', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(linhas))))
    render(<Simulador api={createApi(ctx)} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Refinanciamento Consignado/)).toBeInTheDocument())
  })

  it('avança de parâmetros para valores ao escolher uma linha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(linhas))))
    render(<Simulador api={createApi(ctx)} voltar={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: /Refinanciamento Consignado/ }))
    expect(screen.getByLabelText(/Valor líquido/i)).toBeInTheDocument()
  })
})
