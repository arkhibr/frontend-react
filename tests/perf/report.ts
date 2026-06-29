// tests/perf/report.ts
import { PHASES, type Phase } from './profiles'

export interface Sample { [phase: string]: number }

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const ms = (n: number) => `${Math.round(n)} ms`
const cell = (xs: number[]) =>
  xs.length ? `${ms(median(xs))} (${ms(Math.min(...xs))}–${ms(Math.max(...xs))})` : '—'

/** Imprime uma tabela por MFE: linhas = perfis, colunas = fases (mediana + min–max). */
export function printReport(
  mfeId: string,
  rows: { profile: string; samples: Sample[] }[],
): void {
  // eslint-disable-next-line no-console
  console.log(`\nMFE: ${mfeId}   (mediana de N execuções; min–max entre parênteses)`)
  const table: Record<string, Record<string, string>> = {}
  for (const row of rows) {
    table[row.profile] = {}
    for (const phase of PHASES as readonly Phase[]) {
      table[row.profile][phase] = cell(row.samples.map((s) => s[phase]).filter((v) => v != null))
    }
  }
  // eslint-disable-next-line no-console
  console.table(table)
}
