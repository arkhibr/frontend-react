import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from './authSlice'
import { uiSlice } from './uiSlice'
import { sessionSlice } from './sessionSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
    session: sessionSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
