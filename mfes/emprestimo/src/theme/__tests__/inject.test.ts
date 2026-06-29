import { describe, it, expect } from 'vitest'
import { injectTheme } from '../inject'

describe('injectTheme', () => {
  it('injeta um <style> no host e o remove ao limpar', () => {
    const host = document.createElement('div')
    const dispose = injectTheme(host)
    const style = host.querySelector('style[data-emprestimo-theme]')
    expect(style).not.toBeNull()
    expect(style!.textContent!.length).toBeGreaterThan(0)
    dispose()
    expect(host.querySelector('style[data-emprestimo-theme]')).toBeNull()
  })
})
