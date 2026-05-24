import { describe, it, expect } from 'vitest'
import { uiSlice, toggleSidebar, openModal, closeModal, addToast, removeToast } from '../uiSlice'

const { reducer } = uiSlice

describe('uiSlice', () => {
  it('toggleSidebar inverte sidebarOpen', () => {
    const open = reducer(undefined, toggleSidebar())
    expect(open.sidebarOpen).toBe(false)
    const closed = reducer(open, toggleSidebar())
    expect(closed.sidebarOpen).toBe(true)
  })

  it('openModal e closeModal gerenciam activeModal', () => {
    const opened = reducer(undefined, openModal('confirm-delete'))
    expect(opened.activeModal).toBe('confirm-delete')
    const closed = reducer(opened, closeModal())
    expect(closed.activeModal).toBeNull()
  })

  it('addToast adiciona toast com id único', () => {
    const state = reducer(undefined, addToast({ message: 'Salvo!', type: 'success' }))
    expect(state.toasts).toHaveLength(1)
    expect(state.toasts[0]?.message).toBe('Salvo!')
    expect(state.toasts[0]?.id).toBeTruthy()
  })

  it('removeToast remove pelo id', () => {
    const withToast = reducer(undefined, addToast({ message: 'Erro', type: 'error' }))
    const toastId = withToast.toasts[0]!.id
    const state = reducer(withToast, removeToast(toastId))
    expect(state.toasts).toHaveLength(0)
  })
})
