export interface BffTarget {
  name: string
  baseUrl: string
}

export function resolveTarget(pathname: string, bffs: Record<string, string>): BffTarget | null {
  const match = pathname.match(/^\/bff\/([^/]+)(?:\/.*)?$/)
  if (!match) return null

  const name = match[1]
  const baseUrl = bffs[name]
  if (!baseUrl) return null

  return { name, baseUrl }
}
