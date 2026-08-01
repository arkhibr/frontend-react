// src/shared/lib/validators/validators.bench.ts
// Micro-benchmarks de desempenho das funções puras de validação.
// Rode com: npm run bench (na raiz). Ver ADR-005.
import { bench, describe } from 'vitest'
import { isValidCPF } from './cpf'
import { isValidEmail } from './email'

describe('isValidCPF', () => {
  bench('CPF válido', () => {
    isValidCPF('529.982.247-25')
  })
  bench('CPF inválido (dígito verificador errado)', () => {
    isValidCPF('529.982.247-24')
  })
  bench('CPF malformado (tamanho errado)', () => {
    isValidCPF('123')
  })
})

describe('isValidEmail', () => {
  bench('e-mail válido', () => {
    isValidEmail('marco.mendes@arkhi.com.br')
  })
  bench('e-mail inválido', () => {
    isValidEmail('marco.mendes@@arkhi')
  })
})
