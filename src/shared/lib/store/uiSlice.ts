import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type Toast = { id: string; message: string; type: 'success' | 'error' | 'info' }

type UiState = {
  sidebarOpen: boolean
  activeModal: string | null
  toasts: Toast[]
}

const initialState: UiState = {
  sidebarOpen: true,
  activeModal: null,
  toasts: [],
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    openModal(state, action: PayloadAction<string>) {
      state.activeModal = action.payload
    },
    closeModal(state) {
      state.activeModal = null
    },
    addToast(state, action: PayloadAction<Omit<Toast, 'id'>>) {
      state.toasts.push({ ...action.payload, id: crypto.randomUUID() })
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { toggleSidebar, openModal, closeModal, addToast, removeToast } =
  uiSlice.actions
