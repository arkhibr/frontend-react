export interface HttpClientDeps {
  apiUrl: string
  token: string | null
  onUnauthorized: () => void
  /**
   * Nome do BFF alvo (segmento de `/bff/<nome>` roteado pelo Gateway).
   * Default: `emprestimo` (BFF homônimo). A relação MFE↔BFF não é 1:1 — este MFE
   * pode direcionar outro BFF sobrescrevendo este campo, ou compor mais de um BFF
   * criando um client por alvo. Ver ADR-015.
   */
  bff?: string
}

export function createHttpClient(deps: HttpClientDeps) {
  const bff = deps.bff ?? 'emprestimo'
  const prefix = deps.apiUrl ? `/bff/${bff}` : ''
  return async function client<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${deps.apiUrl}${prefix}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(deps.token ? { Authorization: `Bearer ${deps.token}` } : {}),
        ...options.headers,
      },
    })
    if (res.status === 401) {
      deps.onUnauthorized()
      throw new Error('Sessão expirada')
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }
}
