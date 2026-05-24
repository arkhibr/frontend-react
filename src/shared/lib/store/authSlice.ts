import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { tokenStorage } from '@/shared/auth/tokenStorage'
import { parseToken, type JwtPayload } from '@/shared/auth/tokenParser'

type AuthState = {
  token: string | null
  user: JwtPayload | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
}

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
