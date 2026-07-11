import { describe, it, expect, beforeEach } from 'vitest'
import { assertMfeModule, loadMfeModule, verifyBundleIntegrity } from '../loadMfeModule'

const INTEGRITY = 'sha256-h3mF77nE2aA40YQ79Lz9Y0rjYtOnwXyudx+XEj3i3RE='

describe('assertMfeModule', () => {
  it('aceita módulo com mount e unmount', () => {
    const m = { mount: () => {}, unmount: () => {} }
    expect(assertMfeModule(m, 'http://x/a.js')).toBe(m)
  })

  it('rejeita módulo sem mount', () => {
    expect(() => assertMfeModule({ unmount: () => {} }, 'http://x/a.js')).toThrow(/mount/)
  })

  it('rejeita módulo sem unmount', () => {
    expect(() => assertMfeModule({ mount: () => {} }, 'http://x/a.js')).toThrow(/unmount/)
  })
})

describe('loadMfeModule (instrumentação)', () => {
  beforeEach(() => {
    performance.clearMarks()
    performance.clearMeasures()
  })

  it('não cria measures mfe: quando id é omitido', async () => {
    // import() de URL inexistente rejeita; o que importa é não haver marcação
    await loadMfeModule('http://invalid.test/x.js', INTEGRITY).catch(() => {})
    const mfe = performance.getEntriesByType('measure').filter((m) => m.name.startsWith('mfe:'))
    expect(mfe).toHaveLength(0)
  })

  it('rejeita bytes cujo hash não confere com o manifesto', async () => {
    await expect(verifyBundleIntegrity(new TextEncoder().encode('bundle adulterado').buffer, INTEGRITY))
      .rejects.toThrow(/integridade/)
  })

  it('aceita bundle cujo hash SHA-256 confere com o manifesto', async () => {
    await expect(verifyBundleIntegrity(
      new TextEncoder().encode('abc').buffer,
      'sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=',
    )).resolves.toBeUndefined()
  })
})
