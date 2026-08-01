// gateway/src/routing.bench.ts
// Micro-benchmark da resolução de BFF alvo — caminho quente por requisição.
// Rode com: npm run bench (em gateway/). Ver ADR-005.
import { bench, describe } from 'vitest'
import { resolveTarget } from './routing.ts'

// A relação MFE↔BFF não é 1:1: o mapa é um Record<string,string> genérico
// nome→URL, sem qualquer cardinalidade imposta (ADR-015, Atualização 1.2).
const bffs: Record<string, string> = {
  emprestimo: 'http://localhost:4001',
  endereco: 'http://localhost:4002',
}

describe('resolveTarget', () => {
  bench('rota conhecida (/bff/emprestimo/contratos)', () => {
    resolveTarget('/bff/emprestimo/contratos', bffs)
  })
  bench('rota conhecida com query longa', () => {
    resolveTarget('/bff/endereco/usuario/endereco/detalhe/extra/segmento', bffs)
  })
  bench('BFF desconhecido (miss)', () => {
    resolveTarget('/bff/inexistente/x', bffs)
  })
  bench('prefixo não casa (não-/bff)', () => {
    resolveTarget('/api/qualquer/coisa', bffs)
  })
})
