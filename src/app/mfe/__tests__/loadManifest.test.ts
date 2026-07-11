import { describe, it, expect, vi, afterEach } from 'vitest'
vi.mock('@/shared/config', () => ({ getMfeAllowedOrigins: () => ['https://x'] }))
import { loadManifest } from '../loadManifest'

const ok = {
  schemaVersion: 1,
  mfes: [{ id: 'a', name: 'A', state: 'active', url: 'https://x/a.js', integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', route: '/a', dependsOn: [] }],
}

afterEach(() => vi.restoreAllMocks())

describe('loadManifest', () => {
  it('carrega e valida o manifesto', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(ok))))
    const m = await loadManifest()
    expect(m.mfes[0]!.id).toBe('a')
  })

  it('lança erro se o fetch falhar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })))
    await expect(loadManifest()).rejects.toThrow(/manifesto/i)
  })
})
