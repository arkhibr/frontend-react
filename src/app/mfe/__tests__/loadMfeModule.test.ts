import { describe, it, expect, beforeEach } from 'vitest'
import { assertMfeModule, loadMfeModule } from '../loadMfeModule'

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
    await loadMfeModule('http://invalid.test/x.js').catch(() => {})
    const mfe = performance.getEntriesByType('measure').filter((m) => m.name.startsWith('mfe:'))
    expect(mfe).toHaveLength(0)
  })
})
