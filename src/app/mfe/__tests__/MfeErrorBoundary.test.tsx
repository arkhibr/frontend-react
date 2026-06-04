import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MfeErrorBoundary } from '../MfeErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('MfeErrorBoundary', () => {
  it('renderiza os filhos quando não há erro', () => {
    render(<MfeErrorBoundary mfeName="A"><span>ok</span></MfeErrorBoundary>)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('mostra aviso isolado quando um filho lança erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<MfeErrorBoundary mfeName="Endereço"><Bomb /></MfeErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent(/Endereço/)
  })
})
