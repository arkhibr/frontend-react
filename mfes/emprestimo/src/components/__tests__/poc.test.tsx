import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipStatus, HeaderMarca, ActionButton } from '../poc'

describe('componentes poc', () => {
  it('ChipStatus aplica a classe do tom', () => {
    render(<ChipStatus texto="Pendente" tom="aviso" />)
    expect(screen.getByText('Pendente').className).toMatch(/poc-chip/)
  })
  it('HeaderMarca chama onVoltar', async () => {
    const onVoltar = vi.fn()
    render(<HeaderMarca titulo="Contratos" onVoltar={onVoltar} />)
    await userEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(onVoltar).toHaveBeenCalled()
  })
  it('ActionButton dispara onClick', async () => {
    const onClick = vi.fn()
    render(<ActionButton onClick={onClick}>Refinanciar</ActionButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Refinanciar' }))
    expect(onClick).toHaveBeenCalled()
  })
})
