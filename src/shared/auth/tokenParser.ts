// src/shared/auth/tokenParser.ts
export type JwtPayload = {
  sub: string
  exp: number
  iat: number
  roles?: string[]
}

export function parseToken(token: string): JwtPayload {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Token JWT inválido')

  const raw = parts[1]!
  const decoded = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(decoded) as JwtPayload
}

export function isTokenExpired(token: string): boolean {
  try {
    const { exp } = parseToken(token)
    return Date.now() >= exp * 1000
  } catch {
    return true
  }
}
