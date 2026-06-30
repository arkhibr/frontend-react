import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, unmount } from '../index'

afterEach(() => vi.restoreAllMocks())
const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }

describe('contrato mount/unmount', () => {
  it('mount injeta tema e renderiza a jornada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([]))))
    const el = document.createElement('div')
    mount(el, ctx)
    expect(el.querySelector('style[data-emprestimo-theme]')).not.toBeNull()
    await vi.waitFor(() => expect(el.textContent).toMatch(/Empréstimos/i))
    expect(el.querySelector('style[data-emprestimo-theme]')).not.toBeNull()
  })

  it('unmount remove tema e esvazia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([]))))
    const el = document.createElement('div')
    mount(el, ctx)
    await vi.waitFor(() => expect(el.childElementCount).toBeGreaterThan(0))
    unmount(el)
    expect(el.querySelector('style[data-emprestimo-theme]')).toBeNull()
    expect(el.childElementCount).toBe(0)
  })
})
