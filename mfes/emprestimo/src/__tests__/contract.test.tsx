import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, unmount } from '../index'

afterEach(() => vi.restoreAllMocks())

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimo' }

describe('contrato mount/unmount', () => {
  it('mount renderiza conteúdo dentro do elemento', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ valor: '', parcelas: '' }))))
    const el = document.createElement('div')
    mount(el, ctx)
    await vi.waitFor(() => expect(el.textContent).toMatch(/Empréstimo/i))
  })

  it('unmount esvazia o elemento', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ valor: '', parcelas: '' }))))
    const el = document.createElement('div')
    mount(el, ctx)
    await vi.waitFor(() => expect(el.childElementCount).toBeGreaterThan(0))
    unmount(el)
    expect(el.childElementCount).toBe(0)
  })
})
