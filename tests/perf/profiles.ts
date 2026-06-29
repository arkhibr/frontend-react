// tests/perf/profiles.ts

/** Condições de rede aplicadas via CDP Network.emulateNetworkConditions.
 *  Throughput em bytes/s; latência em ms. download/upload = -1 → sem limite. */
export interface NetworkProfile {
  name: string
  downloadThroughput: number
  uploadThroughput: number
  latency: number
}

export const PROFILES: NetworkProfile[] = [
  { name: 'Baseline', downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
  { name: 'Regular 4G', downloadThroughput: 500_000, uploadThroughput: 375_000, latency: 80 },
  { name: 'Fast 3G', downloadThroughput: 200_000, uploadThroughput: 94_000, latency: 150 },
  { name: 'Slow 3G', downloadThroughput: 50_000, uploadThroughput: 50_000, latency: 400 },
]

/** MFEs medidos. `route` é o caminho navegável; `id` casa com data-mfe e os measures. */
export const TARGETS = [
  { id: 'endereco', route: '/endereco' },
  { id: 'emprestimo', route: '/emprestimos' },
] as const

export const RUNS_PER_CELL = 5
export const PHASES = ['fetchEval', 'validate', 'mount', 'total'] as const
export type Phase = (typeof PHASES)[number]
