import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('renderiza texto dos filhos', () => {
    render(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  it('exibe spinner e remove texto quando loading=true', () => {
    render(<Button loading>Salvar</Button>)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText('Salvar')).not.toBeInTheDocument()
  })

  it('desabilita botão quando loading=true', () => {
    render(<Button loading>Salvar</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('desabilita botão quando disabled=true', () => {
    render(<Button disabled>Salvar</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('chama onClick ao clicar', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Clique</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('não chama onClick quando disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Clique</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('aplica variante danger corretamente', () => {
    render(<Button variant="danger">Excluir</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-danger')
  })
})
