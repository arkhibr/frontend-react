import { tokenStorage } from '@/shared/auth/tokenStorage'
import { ApiError } from './types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export async function httpClient<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.get()

  const response = await fetch(`${BASE_URL}${url}`, {
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

  return response.json() as Promise<T>
}
