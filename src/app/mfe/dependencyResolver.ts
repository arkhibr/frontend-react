import type { MfeEntry } from './types'

/**
 * Ordenação topológica (algoritmo de Kahn): retorna os MFEs em ordem tal que
 * cada um aparece depois de todos os seus dependsOn. Lança erro em caso de ciclo.
 */
export function resolveLoadOrder(mfes: MfeEntry[]): MfeEntry[] {
  const byId = new Map(mfes.map((m) => [m.id, m]))
  const indegree = new Map(mfes.map((m) => [m.id, m.dependsOn.length]))
  const dependents = new Map<string, string[]>()

  for (const m of mfes) {
    for (const dep of m.dependsOn) {
      dependents.set(dep, [...(dependents.get(dep) ?? []), m.id])
    }
  }

  const queue = mfes.filter((m) => indegree.get(m.id) === 0).map((m) => m.id)
  const ordered: MfeEntry[] = []

  while (queue.length > 0) {
    const id = queue.shift() as string
    ordered.push(byId.get(id) as MfeEntry)
    for (const dependent of dependents.get(id) ?? []) {
      const next = (indegree.get(dependent) as number) - 1
      indegree.set(dependent, next)
      if (next === 0) queue.push(dependent)
    }
  }

  if (ordered.length !== mfes.length) {
    const remaining = mfes.filter((m) => !ordered.includes(m)).map((m) => m.id)
    throw new Error(`[mfe-manifest] ciclo de dependência detectado entre: ${remaining.join(', ')}`)
  }

  return ordered
}
