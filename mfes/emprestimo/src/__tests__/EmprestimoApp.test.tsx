import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmprestimoApp } from '../EmprestimoApp'

afterEach(() => vi.restoreAllMocks())

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimo' }

describe('EmprestimoApp', () => {
  it('carrega a simulação atual da API e exibe no formulário', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ valor: '10000', parcelas: '12' })),
    ))
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByLabelText(/Valor/i)).toHaveValue('10000'))
  })

  it('salva a simulação e mostra confirmação', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ valor: '10000', parcelas: '12' })),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByLabelText(/Valor/i)).toHaveValue('10000'))
    await userEvent.click(screen.getByRole('button', { name: /Simular/i }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/registrada/i))
    expect(fetchMock).toHaveBeenCalledWith('http://api/usuario/emprestimo', expect.objectContaining({ method: 'PUT' }))
  })

  it('cai para formulário vazio quando a API falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    render(<EmprestimoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByLabelText(/Valor/i)).toHaveValue(''))
  })
})
