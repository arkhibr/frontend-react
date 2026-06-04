import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadManifest } from '../loadManifest'

const ok = {
  schemaVersion: 1,
  mfes: [{ id: 'a', name: 'A', state: 'active', url: 'http://x/a.js', route: '/a', dependsOn: [] }],
}

afterEach(() => vi.restoreAllMocks())

describe('loadManifest', () => {
  it('carrega e valida o manifesto', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(ok))))
    const m = await loadManifest()
    expect(m.mfes[0].id).toBe('a')
  })

  it('lança erro se o fetch falhar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })))
    await expect(loadManifest()).rejects.toThrow(/manifesto/i)
  })
})
