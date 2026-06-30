import { describe, expect, it } from 'vitest'

const fontesDoShell = import.meta.glob('/src/**/*.{ts,tsx,css}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const classesInternasDeMfe = /\b(?:poc-|emprestimo-(?:abas|acoes|action-button|app|bloco|card|chip|detail-card|empty|feature-button|feedback|form|header|inline-panel|metric|metrics-grid|next-installment|product-card|product-grid|record|screen|success-card|tabela|table-card|term-card))\b/

describe('ADR-014 contrato visual do shell', () => {
  it('não referencia classes internas de MFEs no código do shell', () => {
    const arquivosComAcoplamento = Object.entries(fontesDoShell)
      .filter(([caminho]) => !caminho.endsWith('/visualContract.test.ts'))
      .filter(([, conteudo]) => classesInternasDeMfe.test(conteudo))
      .map(([caminho]) => caminho)

    expect(arquivosComAcoplamento).toEqual([])
  })
})
