import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmprestimoForm } from '../EmprestimoForm'

describe('EmprestimoForm', () => {
  it('renderiza os campos com valores iniciais', () => {
    render(<EmprestimoForm initial={{ valor: '10000', parcelas: '12' }} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/Valor/i)).toHaveValue('10000')
    expect(screen.getByLabelText(/Parcelas/i)).toHaveValue('12')
  })

  it('chama onSubmit com os dados ao simular', async () => {
    const onSubmit = vi.fn()
    render(<EmprestimoForm initial={{ valor: '', parcelas: '' }} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/Valor/i), '5000')
    await userEvent.type(screen.getByLabelText(/Parcelas/i), '6')
    await userEvent.click(screen.getByRole('button', { name: /Simular/i }))
    expect(onSubmit).toHaveBeenCalledWith({ valor: '5000', parcelas: '6' })
  })
})
