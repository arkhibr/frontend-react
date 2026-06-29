import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipStatus, HeaderMarca, ActionButton, BlocoExpansivel, FeatureButton } from '../poc'

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
  it('HeaderMarca sem onVoltar não mostra botão', () => {
    render(<HeaderMarca titulo="Contratos" />)
    expect(screen.queryByRole('button', { name: /voltar/i })).toBeNull()
  })
  it('ActionButton dispara onClick', async () => {
    const onClick = vi.fn()
    render(<ActionButton onClick={onClick}>Refinanciar</ActionButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Refinanciar' }))
    expect(onClick).toHaveBeenCalled()
  })
  it('ActionButton aceita variante secundario', () => {
    render(<ActionButton onClick={() => {}} variante="secundario">Cancelar</ActionButton>)
    expect(screen.getByRole('button', { name: 'Cancelar' }).className).toMatch(/secundario/)
  })
  it('FeatureButton dispara onClick', async () => {
    const onClick = vi.fn()
    render(<FeatureButton onClick={onClick}>Nova simulação</FeatureButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Nova simulação' }))
    expect(onClick).toHaveBeenCalled()
  })
  it('BlocoExpansivel abre e fecha ao clicar', async () => {
    render(<BlocoExpansivel titulo="Ver mais"><p>Conteúdo oculto</p></BlocoExpansivel>)
    expect(screen.queryByText('Conteúdo oculto')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Ver mais/i }))
    expect(screen.getByText('Conteúdo oculto')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Ver mais/i }))
    expect(screen.queryByText('Conteúdo oculto')).toBeNull()
  })
})
