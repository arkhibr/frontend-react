import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { EnderecoApp } from '../EnderecoApp'

afterEach(() => vi.restoreAllMocks())

describe('EnderecoApp', () => {
  it('carrega o endereço atual da API e exibe no formulário', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' })),
    ))
    render(<EnderecoApp ctx={{ apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/endereco' }} />)
    await waitFor(() => expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Praça da Sé'))
  })
})
