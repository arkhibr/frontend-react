export type MfeState = 'active' | 'disabled' | 'maintenance'

export interface MfeEntry {
  id: string
  name: string
  state: MfeState
  url: string
  route: string
  dependsOn: string[]
}

export interface MfeManifest {
  schemaVersion: number
  mfes: MfeEntry[]
}

/** Contrato que todo bundle de MFE deve exportar. */
export interface MfeMountContext {
  apiUrl: string
  token: string | null
  onUnauthorized: () => void
  basePath: string
}

export interface MfeModule {
  mount: (el: HTMLElement, ctx: MfeMountContext) => void
  unmount: (el: HTMLElement) => void
}
