import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnderecoForm } from '../EnderecoForm'

describe('EnderecoForm', () => {
  it('renderiza os campos com valores iniciais', () => {
    render(<EnderecoForm initial={{ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' }} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/CEP/i)).toHaveValue('01001000')
    expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Praça da Sé')
  })

  it('chama onSubmit com os dados ao salvar', async () => {
    const onSubmit = vi.fn()
    render(<EnderecoForm initial={{ cep: '', logradouro: '', numero: '' }} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/CEP/i), '01001000')
    await userEvent.type(screen.getByLabelText(/Logradouro/i), 'Praça da Sé')
    await userEvent.type(screen.getByLabelText(/Número/i), '1')
    await userEvent.click(screen.getByRole('button', { name: /Salvar/i }))
    expect(onSubmit).toHaveBeenCalledWith({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' })
  })
})
