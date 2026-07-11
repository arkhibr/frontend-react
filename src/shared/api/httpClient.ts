import { tokenStorage } from '@/shared/auth/tokenStorage'
import { getApiUrl } from '@/shared/config'
import { ApiError } from './types'

export async function httpClient<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.get()
  const baseUrl = getApiUrl()

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    tokenStorage.clear()
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    throw new ApiError(401, 'Sessão expirada')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
