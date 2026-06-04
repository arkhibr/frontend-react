import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { tokenStorage } from '@/shared/auth/tokenStorage'
import { parseToken, isTokenExpired, type JwtPayload } from '@/shared/auth/tokenParser'

type AuthState = {
  token: string | null
  user: JwtPayload | null
  isAuthenticated: boolean
}

// Hidrata o estado a partir do token persistido no sessionStorage, para que
// uma sessão ativa sobreviva a um reload sem novo login.
function hydrateInitialState(): AuthState {
  const token = tokenStorage.get()
  if (token && !isTokenExpired(token)) {
    try {
      return { token, user: parseToken(token), isAuthenticated: true }
    } catch {
      tokenStorage.clear()
    }
  }
  return { token: null, user: null, isAuthenticated: false }
}

const initialState: AuthState = hydrateInitialState()

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action: PayloadAction<{ token: string }>) {
      const { token } = action.payload
      tokenStorage.set(token)
      state.token = token
      state.user = parseToken(token)
      state.isAuthenticated = true
    },
    logout(state) {
      tokenStorage.clear()
      state.token = null
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { login, logout } = authSlice.actions
