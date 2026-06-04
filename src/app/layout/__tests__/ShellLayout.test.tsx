import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from '@/shared/lib/store/authSlice'
import { ShellLayout } from '../ShellLayout'
import type { MfeEntry } from '@/app/mfe/types'

const mk = (id: string, state: MfeEntry['state']): MfeEntry => ({
  id, name: id.toUpperCase(), state, url: `http://x/${id}.js`, route: `/${id}`, dependsOn: [],
})

function renderLayout(mfes: MfeEntry[]) {
  const store = configureStore({ reducer: { auth: authSlice.reducer } })
  return render(
    <Provider store={store}>
      <MemoryRouter><ShellLayout mfes={mfes} /></MemoryRouter>
    </Provider>,
  )
}

describe('ShellLayout', () => {
  it('mostra no menu os MFEs active e maintenance', () => {
    renderLayout([mk('endereco', 'active'), mk('emprestimo', 'maintenance')])
    expect(screen.getByRole('link', { name: /ENDERECO/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /EMPRESTIMO/ })).toBeInTheDocument()
  })

  it('não mostra MFEs disabled', () => {
    renderLayout([mk('endereco', 'active'), mk('oculto', 'disabled')])
    expect(screen.queryByRole('link', { name: /OCULTO/ })).not.toBeInTheDocument()
  })
})
