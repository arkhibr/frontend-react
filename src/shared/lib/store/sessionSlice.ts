import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type SessionState = {
  lastActivityAt: number | null
  inactivityTimeoutMs: number
}

const initialState: SessionState = {
  lastActivityAt: null,
  inactivityTimeoutMs: 30 * 60 * 1000,
}

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    recordActivity(state) {
      state.lastActivityAt = Date.now()
    },
    setInactivityTimeout(state, action: PayloadAction<number>) {
      state.inactivityTimeoutMs = action.payload
    },
  },
})

export const { recordActivity, setInactivityTimeout } = sessionSlice.actions
