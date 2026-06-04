import type { MfeModule } from './types'

export function assertMfeModule(mod: unknown, url: string): MfeModule {
  const m = mod as Partial<MfeModule>
  if (typeof m?.mount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta mount()`)
  if (typeof m?.unmount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta unmount()`)
  return m as MfeModule
}

export async function loadMfeModule(url: string): Promise<MfeModule> {
  const mod = await import(/* @vite-ignore */ url)
  return assertMfeModule(mod, url)
}
