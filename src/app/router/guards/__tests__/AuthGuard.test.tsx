import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect } from 'vitest'
import { AuthGuard } from '../AuthGuard'
import { authSlice } from '@/shared/lib/store/authSlice'
import { uiSlice } from '@/shared/lib/store/uiSlice'
import { sessionSlice } from '@/shared/lib/store/sessionSlice'

// { sub: 'user1', exp: 9999999999, iat: 1700000000 }
const TOKEN =
  'eyJhbGciOiJSUzI1NiJ9' +
  '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ' +
  '.signature'

function makeStore(isAuthenticated: boolean) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      ui: uiSlice.reducer,
      session: sessionSlice.reducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated,
        token: isAuthenticated ? TOKEN : null,
        user: isAuthenticated
          ? { sub: 'user1', exp: 9999999999, iat: 1700000000 }
          : null,
      },
    },
  })
}

function renderAuthGuard(isAuthenticated: boolean) {
  render(
    <Provider store={makeStore(isAuthenticated)}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<div>Área restrita</div>} />
          </Route>
          <Route path="/login" element={<div>Tela de login</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('AuthGuard', () => {
  it('renderiza rota protegida quando autenticado', () => {
    renderAuthGuard(true)
    expect(screen.getByText('Área restrita')).toBeInTheDocument()
  })

  it('redireciona para /login quando não autenticado', () => {
    renderAuthGuard(false)
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
    expect(screen.queryByText('Área restrita')).not.toBeInTheDocument()
  })
})
