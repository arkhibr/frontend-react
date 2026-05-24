// src/shared/auth/tokenStorage.ts
const KEY = 'portal_access_token'

export const tokenStorage = {
  get(): string | null {
    return sessionStorage.getItem(KEY)
  },
  set(token: string): void {
    sessionStorage.setItem(KEY, token)
  },
  clear(): void {
    sessionStorage.removeItem(KEY)
  },
}
