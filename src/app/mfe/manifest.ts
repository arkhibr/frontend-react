import type { MfeManifest, MfeEntry, MfeState } from './types'

const SUPPORTED_SCHEMA = 1
const STATES: MfeState[] = ['active', 'disabled', 'maintenance']
const INTEGRITY = /^sha256-[A-Za-z0-9+/]{43}=$/

function fail(msg: string): never {
  throw new Error(`[mfe-manifest] ${msg}`)
}

function validateEntry(raw: unknown, index: number, allowedOrigins: Set<string>, allowInsecureLocalhost: boolean): MfeEntry {
  if (typeof raw !== 'object' || raw === null) fail(`mfes[${index}] não é um objeto`)
  const e = raw as Record<string, unknown>
  for (const field of ['id', 'name', 'url', 'integrity', 'route'] as const) {
    if (typeof e[field] !== 'string' || e[field] === '') fail(`mfes[${index}].${field} ausente ou vazio`)
  }
  if (!INTEGRITY.test(e.integrity as string)) fail(`mfes[${index}].integrity inválido`)
  let url: URL
  try {
    url = new URL(e.url as string)
  } catch {
    fail(`mfes[${index}].url inválida`)
  }
  const localHttp = allowInsecureLocalhost && url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (url.protocol !== 'https:' && !localHttp) fail(`mfes[${index}].url deve usar HTTPS`)
  if (!allowedOrigins.has(url.origin)) fail(`mfes[${index}].url usa origem não permitida`)
  if (!/^\/[A-Za-z0-9/_-]*$/.test(e.route as string)) fail(`mfes[${index}].route inválida`)
  if (!STATES.includes(e.state as MfeState)) fail(`mfes[${index}].state inválido: ${String(e.state)}`)
  if (!Array.isArray(e.dependsOn) || e.dependsOn.some((d) => typeof d !== 'string')) {
    fail(`mfes[${index}].dependsOn deve ser um array de strings`)
  }
  return {
    id: e.id as string,
    name: e.name as string,
    state: e.state as MfeState,
    url: url.toString(),
    integrity: e.integrity as string,
    route: e.route as string,
    dependsOn: e.dependsOn as string[],
  }
}

export function validateManifest(
  raw: unknown,
  options: { allowedOrigins: string[]; allowInsecureLocalhost?: boolean },
): MfeManifest {
  if (typeof raw !== 'object' || raw === null) fail('manifesto não é um objeto')
  const m = raw as Record<string, unknown>
  if (m.schemaVersion !== SUPPORTED_SCHEMA) fail(`schemaVersion não suportada: ${String(m.schemaVersion)} (esperado ${SUPPORTED_SCHEMA})`)
  if (!Array.isArray(m.mfes)) fail('mfes deve ser um array')

  const allowedOrigins = new Set(options.allowedOrigins)
  const mfes = m.mfes.map((entry, index) => validateEntry(entry, index, allowedOrigins, options.allowInsecureLocalhost ?? false))

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
