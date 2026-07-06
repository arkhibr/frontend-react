import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmprestimoApp } from '../EmprestimoApp'

afterEach(() => vi.restoreAllMocks())
const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }

const contrato = {
  numero: '001-A', linhaDeCredito: 'Pessoal', valorLiberado: 5000, saldoAtual: 3200,
  parcelas: 24, parcelasRestantes: 14, taxaDeJuros: 1.5, cetMensal: 1.6, cetAnual: 21,
  temAtraso: false, proximaParcela: null,
}

function stubFetch(handler: (url: string) => unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    new Response(JSON.stringify(handler(url)))
  ))
}

describe('EmprestimoApp', () => {
  it('renderiza conteúdo síncrono já no primeiro render (resiliência ao perf)', () => {
    render(<EmprestimoApp ctx={ctx} />)
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela Contrato ao clicar num contrato e volta', async () => {
    stubFetch((url) => {
      if (url.includes('contratos/001-A')) return contrato
      if (url.includes('/contratos')) return [contrato]
      if (url.includes('/propostas')) return []
      return []
    })
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByText(/001-A/)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/001-A/))
    await waitFor(() => expect(screen.getByText(/Pessoal/)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Voltar/i }))
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela Simulador ao clicar em Simular novo empréstimo e volta', async () => {
    stubFetch((url) => {
      if (url.includes('/simulacao/parametros')) return []
      return []
    })
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByText(/Simular novo empréstimo/i)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/Simular novo empréstimo/i))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Simular empréstimo/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Voltar/i }))
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela ConsultaScreen (extrato) a partir do Contrato', async () => {
    stubFetch((url) => {
      if (url.includes('/extrato')) return []
      if (url.includes('contratos/001-A')) return contrato
      if (url.includes('/contratos')) return [contrato]
      if (url.includes('/propostas')) return []
      return []
    })
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByText(/001-A/)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/001-A/))
    await waitFor(() => expect(screen.getByText(/Ver extrato/i)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/Ver extrato/i))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Extrato/i })).toBeInTheDocument())
  })
})
