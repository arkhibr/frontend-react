import type { MiddlewareHandler } from 'hono'
import { resolveTarget } from './routing.ts'
import type { GatewayEnv } from './types.ts'

export function createProxyRouter(bffs: Record<string, string>, internalGatewayKey: string): MiddlewareHandler<GatewayEnv> {
  return async (c) => {
    const pathname = c.req.path
    const target = resolveTarget(pathname, bffs)
    if (!target) {
      return c.json({
        error: 'not_found',
        message: 'Rota não encontrada.',
        correlationId: c.get('correlationId') ?? 'unknown',
      }, 404)
    }

    const remainder = pathname.slice(`/bff/${target.name}`.length)
    const url = new URL(remainder === '' ? '/' : remainder, target.baseUrl)
    url.search = new URL(c.req.url).search

    const headers = new Headers(c.req.raw.headers)
    headers.delete('authorization')
    headers.delete('host')
    const auth = c.get('auth')
    headers.set('X-Correlation-Id', c.get('correlationId') ?? 'unknown')
    headers.set('X-Internal-Gateway-Key', internalGatewayKey)
    headers.set('X-Authenticated-Subject', auth.sub)
    headers.set('X-Authenticated-Roles', auth.roles.join(','))

    const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD'
    const init: RequestInit & { duplex?: 'half' } = { method: c.req.method, headers }
    if (hasBody) {
      init.body = c.req.raw.body
      init.duplex = 'half'
    }

    return fetch(url, init)
  }
}
