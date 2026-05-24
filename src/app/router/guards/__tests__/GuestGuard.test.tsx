import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect } from 'vitest'
import { GuestGuard } from '../GuestGuard'
import { authSlice } from '@/shared/lib/store/authSlice'
import { uiSlice } from '@/shared/lib/store/uiSlice'
import { sessionSlice } from '@/shared/lib/store/sessionSlice'

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

function renderGuestGuard(isAuthenticated: boolean) {
  render(
    <Provider store={makeStore(isAuthenticated)}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<div>Tela de login</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('GuestGuard', () => {
  it('renderiza rota pública quando não autenticado', () => {
    renderGuestGuard(false)
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })

  it('redireciona para /dashboard quando já autenticado', () => {
    renderGuestGuard(true)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument()
  })
})
