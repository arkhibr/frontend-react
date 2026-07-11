import { validateManifest } from './manifest'
import type { MfeManifest } from './types'
import { getMfeAllowedOrigins } from '@/shared/config'

export async function loadManifest(): Promise<MfeManifest> {
  const res = await fetch('/mfe-manifest.json')
  if (!res.ok) throw new Error(`[mfe-manifest] falha ao carregar manifesto: HTTP ${res.status}`)
  const data = await res.json()
  return validateManifest(data, {
    allowedOrigins: getMfeAllowedOrigins(),
    allowInsecureLocalhost: import.meta.env.DEV,
  })
}
