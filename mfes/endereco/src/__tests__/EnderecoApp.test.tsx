import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnderecoApp } from '../EnderecoApp'

afterEach(() => vi.restoreAllMocks())

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/endereco' }

describe('EnderecoApp', () => {
  it('carrega o endereço atual da API e exibe no formulário', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' })),
    ))
    render(<EnderecoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Praça da Sé'))
  })

  it('salva o endereço e mostra confirmação', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' })),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<EnderecoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Praça da Sé'))
    await userEvent.click(screen.getByRole('button', { name: /Salvar/i }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/atualizado/i))
    expect(fetchMock).toHaveBeenCalledWith('http://api/usuario/endereco', expect.objectContaining({ method: 'PUT' }))
  })

  it('cai para formulário vazio quando a API falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    render(<EnderecoApp ctx={ctx} />)
    await waitFor(() => expect(screen.getByLabelText(/Logradouro/i)).toHaveValue(''))
  })
})
