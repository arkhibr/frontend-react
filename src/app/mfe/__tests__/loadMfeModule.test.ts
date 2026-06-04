import { describe, it, expect } from 'vitest'
import { assertMfeModule } from '../loadMfeModule'

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
