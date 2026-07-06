export interface HttpClientDeps {
  apiUrl: string
  token: string | null
  onUnauthorized: () => void
}

export function createHttpClient(deps: HttpClientDeps) {
  const prefix = deps.apiUrl ? '/bff/emprestimo' : ''
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
    return res.json() as Promise<T>
  }
}
