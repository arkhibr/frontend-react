import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from '@/shared/lib/store/authSlice'
import { MfeHost } from '../MfeHost'
import { loadMfeModule } from '../loadMfeModule'
import type { MfeEntry } from '../types'

const mount = vi.fn()
const unmount = vi.fn()

vi.mock('../loadMfeModule', () => ({
  loadMfeModule: vi.fn(async () => ({ mount, unmount })),
}))

const entry: MfeEntry = {
  id: 'endereco', name: 'Endereço', state: 'active',
  url: 'http://x/endereco.js', route: '/endereco', dependsOn: [],
}

function renderHost(e: MfeEntry) {
  const store = configureStore({ reducer: { auth: authSlice.reducer } })
  return render(<Provider store={store}><MfeHost entry={e} /></Provider>)
}

beforeEach(() => {
  mount.mockClear()
  unmount.mockClear()
  vi.mocked(loadMfeModule).mockResolvedValue({ mount, unmount })
  performance.clearMarks()
  performance.clearMeasures()
})

describe('MfeHost', () => {
  it('chama mount com a div e o contexto quando active', async () => {
    renderHost(entry)
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(1))
    const [el, ctx] = mount.mock.calls[0]
    expect(el).toBeInstanceOf(HTMLElement)
    expect(ctx).toMatchObject({ basePath: '/endereco' })
    expect(typeof ctx.onUnauthorized).toBe('function')
  })

  it('chama unmount ao desmontar o componente', async () => {
    const { unmount: unmountReact } = renderHost(entry)
    await waitFor(() => expect(mount).toHaveBeenCalled())
    unmountReact()
    expect(unmount).toHaveBeenCalledTimes(1)
  })

  it('mostra aviso e não monta quando maintenance', async () => {
    renderHost({ ...entry, state: 'maintenance' })
    expect(screen.getByRole('status')).toHaveTextContent(/manuten/i)
    expect(mount).not.toHaveBeenCalled()
  })

  it('exibe o aviso do error boundary quando o carregamento falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(loadMfeModule).mockRejectedValueOnce(new Error('404'))
    renderHost(entry)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/indisponível/i))
  })

  it('emite measures mfe:<id>:total e mfe:<id>:mount após montar', async () => {
    renderHost(entry)
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(performance.getEntriesByName('mfe:endereco:mount', 'measure')).toHaveLength(1)
      expect(performance.getEntriesByName('mfe:endereco:total', 'measure')).toHaveLength(1)
    })
  })
})
