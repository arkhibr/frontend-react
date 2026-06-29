import type { MfeModule } from './types'
import { markStart, markEnd } from './perf'

export function assertMfeModule(mod: unknown, url: string): MfeModule {
  const m = mod as Partial<MfeModule>
  if (typeof m?.mount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta mount()`)
  if (typeof m?.unmount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta unmount()`)
  return m as MfeModule
}

export async function loadMfeModule(url: string, id?: string): Promise<MfeModule> {
  if (id) markStart(id, 'fetchEval')
  const mod = await import(/* @vite-ignore */ url)
  if (id) markEnd(id, 'fetchEval')

  if (id) markStart(id, 'validate')
  const result = assertMfeModule(mod, url)
  if (id) markEnd(id, 'validate')

  return result
}
