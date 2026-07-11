import type { MfeModule } from './types'
import { markStart, markEnd } from './perf'

export function assertMfeModule(mod: unknown, url: string): MfeModule {
  const m = mod as Partial<MfeModule>
  if (typeof m?.mount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta mount()`)
  if (typeof m?.unmount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta unmount()`)
  return m as MfeModule
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function verifyBundleIntegrity(bytes: ArrayBuffer, integrity: string): Promise<void> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const actual = `sha256-${toBase64(new Uint8Array(digest))}`
  if (actual !== integrity) throw new Error('[mfe] integridade do bundle inválida')
}

export async function loadMfeModule(url: string, integrity: string, id?: string): Promise<MfeModule> {
  if (id) markStart(id, 'fetchEval')
  const response = await fetch(url, { credentials: 'omit', cache: 'no-store' })
  if (!response.ok) throw new Error(`[mfe] bundle ${url} respondeu HTTP ${response.status}`)
  const bytes = await response.arrayBuffer()
  await verifyBundleIntegrity(bytes, integrity)
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }))
  let mod: unknown
  try {
    mod = await import(/* @vite-ignore */ blobUrl)
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
  if (id) markEnd(id, 'fetchEval')

  if (id) markStart(id, 'validate')
  const result = assertMfeModule(mod, url)
  if (id) markEnd(id, 'validate')

  return result
}
