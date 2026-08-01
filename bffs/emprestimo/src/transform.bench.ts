// bffs/emprestimo/src/transform.bench.ts
// Micro-benchmark da transformação legado (PascalCase) → contrato (camelCase),
// o trabalho real de cada resposta do BFF. Rode com: npm run bench (em bffs/emprestimo/).
// Ver ADR-005.
import { bench, describe } from 'vitest'
import { toContrato, toProposta } from './transform.ts'
import type { ContratoLegacy, PropostaLegacy } from './legacyBackend.ts'

const contratoLegacy: ContratoLegacy = {
  Contrato: '123456-7', DescricaoDaLinha: 'Crédito Pessoal', ValorLiberado: 15000,
  SaldoAtual: 9245.5, NumeroDeParcelas: 24, ParcelasRestantes: 14, TaxaDeJuros: 1.89,
  TaxaDaCETMensal: 2.11, TaxaDaCETAnual: 28.7, TemParcelasEmAtraso: false,
  ProximaParcela: { Vencimento: '2026-07-10', Valor: 944.3 },
}

const propostaLegacy: PropostaLegacy = {
  Contrato: 'PRP-1', DescricaoDaLinha: 'Refin', TaxaDeJuros: 1.39, DataDeEmissao: '2026-06-20T10:15:00',
  ValorBruto: 12000, ValorLiquido: 10850, NumeroDeParcelas: 24, StatusDaProposta: { Value: 'Pendente' },
}

describe('transform', () => {
  bench('toContrato (um item)', () => {
    toContrato(contratoLegacy)
  })
  bench('toProposta (um item)', () => {
    toProposta(propostaLegacy)
  })
  bench('toContrato — lista de 100', () => {
    for (let i = 0; i < 100; i++) toContrato(contratoLegacy)
  })
})
