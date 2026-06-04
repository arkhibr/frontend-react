import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { authSlice } from '@/shared/lib/store/authSlice'
import LoginPage from '../index'
import { loginRequest } from '@/features/auth/loginRequest'

// JWT válido (parseável): { sub: 'user1', exp: 9999999999, iat: 1700000000 }
const VALID_TOKEN =
  'eyJhbGciOiJSUzI1NiJ9' +
  '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ' +
  '.signature'

vi.mock('@/features/auth/loginRequest', () => ({ loginRequest: vi.fn() }))
const navigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

function renderPage() {
  const store = configureStore({ reducer: { auth: authSlice.reducer } })
  render(
    <Provider store={store}>
      <MemoryRouter><LoginPage /></MemoryRouter>
    </Provider>,
  )
  return store
}

beforeEach(() => vi.clearAllMocks())

describe('LoginPage', () => {
  it('autentica e navega para o dashboard com credenciais válidas', async () => {
    vi.mocked(loginRequest).mockResolvedValue(VALID_TOKEN)
    const store = renderPage()
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'usuario@teste.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'senha123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(store.getState().auth.isAuthenticated).toBe(true))
    expect(loginRequest).toHaveBeenCalledWith('usuario@teste.com', 'senha123')
    expect(navigate).toHaveBeenCalledWith('/dashboard')
  })

  it('mostra alerta quando as credenciais são inválidas', async () => {
    vi.mocked(loginRequest).mockRejectedValue(new Error('Credenciais inválidas'))
    renderPage()
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'x@y.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'errado')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
