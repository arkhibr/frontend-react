import type { MfeManifest, MfeEntry, MfeState } from './types'

const SUPPORTED_SCHEMA = 1
const STATES: MfeState[] = ['active', 'disabled', 'maintenance']

function fail(msg: string): never {
  throw new Error(`[mfe-manifest] ${msg}`)
}

function validateEntry(raw: unknown, index: number): MfeEntry {
  if (typeof raw !== 'object' || raw === null) fail(`mfes[${index}] não é um objeto`)
  const e = raw as Record<string, unknown>
  for (const field of ['id', 'name', 'url', 'route'] as const) {
    if (typeof e[field] !== 'string' || e[field] === '') fail(`mfes[${index}].${field} ausente ou vazio`)
  }
  if (!STATES.includes(e.state as MfeState)) fail(`mfes[${index}].state inválido: ${String(e.state)}`)
  if (!Array.isArray(e.dependsOn) || e.dependsOn.some((d) => typeof d !== 'string')) {
    fail(`mfes[${index}].dependsOn deve ser um array de strings`)
  }
  return {
    id: e.id as string,
    name: e.name as string,
    state: e.state as MfeState,
    url: e.url as string,
    route: e.route as string,
    dependsOn: e.dependsOn as string[],
  }
}

export function validateManifest(raw: unknown): MfeManifest {
  if (typeof raw !== 'object' || raw === null) fail('manifesto não é um objeto')
  const m = raw as Record<string, unknown>
  if (m.schemaVersion !== SUPPORTED_SCHEMA) fail(`schemaVersion não suportada: ${String(m.schemaVersion)} (esperado ${SUPPORTED_SCHEMA})`)
  if (!Array.isArray(m.mfes)) fail('mfes deve ser um array')

  const mfes = m.mfes.map(validateEntry)

  const ids = new Set<string>()
  for (const e of mfes) {
    if (ids.has(e.id)) fail(`id duplicado: ${e.id}`)
    ids.add(e.id)
  }
  for (const e of mfes) {
    for (const dep of e.dependsOn) {
      if (!ids.has(dep)) fail(`mfes[${e.id}].dependsOn referencia id inexistente: ${dep}`)
    }
  }

  return { schemaVersion: SUPPORTED_SCHEMA, mfes }
}
