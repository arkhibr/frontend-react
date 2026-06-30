import { describe, expect, it } from 'vitest'
import css from '../theme.css?raw'

function cssSemComentarios(): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function seletoresDoCss(): string[] {
  return [...cssSemComentarios().matchAll(/([^{}]+)\{/g)]
    .flatMap((match) => {
      const trecho = match[1]?.split('}').pop()?.trim() ?? ''
      if (trecho === '' || trecho.startsWith('@')) return []
      return trecho.split(',').map((seletor) => seletor.trim())
    })
}

describe('ADR-014 contrato visual do MFE empréstimo', () => {
  it('mantém todos os seletores CSS escopados no namespace do MFE', () => {
    const seletoresNaoEscopados = seletoresDoCss()
      .filter((seletor) => !seletor.startsWith('.emprestimo-'))

    expect(seletoresNaoEscopados).toEqual([])
  })

  it('não define reset global ou seletores de documento', () => {
    expect(cssSemComentarios()).not.toMatch(/(^|[{},]\s*)(:root|html|body|\*)\b/)
  })

  it('consome tokens globais do shell com fallback local', () => {
    const tokensGlobais = [...css.matchAll(/var\(--(?:color|font|radius|space)-[^)]+\)/g)]
      .map((match) => match[0])

    expect(tokensGlobais).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^var\(--color-primary,\s*#[0-9a-fA-F]{6}\)$/),
        expect.stringMatching(/^var\(--color-secondary,\s*#[0-9a-fA-F]{6}\)$/),
        expect.stringMatching(/^var\(--color-surface,\s*#[0-9a-fA-F]{6}\)$/),
        expect.stringMatching(/^var\(--color-danger,\s*#[0-9a-fA-F]{6}\)$/),
        expect.stringMatching(/^var\(--font-family-sans,\s*.+\)$/),
      ]),
    )
    expect(tokensGlobais.every((token) => token.includes(','))).toBe(true)
  })
})
