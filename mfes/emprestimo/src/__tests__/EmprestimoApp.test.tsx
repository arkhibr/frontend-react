import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmprestimoApp } from '../EmprestimoApp'

afterEach(() => vi.restoreAllMocks())
const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }

const contratoDto = {
  Contrato: '001-A', DescricaoDaLinha: 'Pessoal', ValorLiberado: 5000, SaldoAtual: 3200,
  NumeroDeParcelas: 24, ParcelasRestantes: 14, TaxaDeJuros: 1.5, CodigoDaLinha: 10,
  ValorBruto: 6000, TaxaDaCETMensal: 1.6, TaxaDaCETAnual: 21, TemParcelasEmAtraso: false,
  ProximaParcela: null,
}

function stubFetch(handler: (url: string) => unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    new Response(JSON.stringify(handler(url)))
  ))
}

describe('EmprestimoApp', () => {
  it('renderiza conteúdo síncrono já no primeiro render (resiliência ao perf)', () => {
    render(<EmprestimoApp ctx={ctx} />)
    // Sem esperar fetch: já há o header da jornada visível.
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela Contrato ao clicar num contrato e volta', async () => {
    stubFetch((url) => {
      if (url.includes('contratos/001-A')) return contratoDto
      if (url.includes('/contratos')) return [contratoDto]
      if (url.includes('/propostas')) return []
      return []
    })
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByText(/001-A/)).toBeInTheDocument())
    await userEvent.click(screen.getByText(/001-A/))
    // tela Contrato aparece após carregar
    await waitFor(() => expect(screen.getByText(/Pessoal/)).toBeInTheDocument())
    // botão Voltar retorna para ContratosPropostas
    await userEvent.click(screen.getByRole('button', { name: /Voltar/i }))
    expect(screen.getByRole('heading', { name: /Empréstimos/i })).toBeInTheDocument()
  })

  it('navega para tela Simulador ao clicar em Simular novo empréstimo e volta', async () => {
    stubFetch((url) => {
      if (url.includes('/simulacao')) return { LinhasDeEmprestimo: [] }
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
      if (url.includes('contratos/001-A')) return contratoDto
      if (url.includes('/contratos')) return [contratoDto]
      if (url.includes('/propostas')) return []
      if (url.includes('ObterExtratoEmprestimo')) return { Contrato: '001-A', MovimentoDeEmprestimo: [] }
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
