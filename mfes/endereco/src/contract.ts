// Contrato publicado pelo shell (ADR-009). Cópia local para manter o MFE autônomo.
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
