import { timingSafeEqual } from 'node:crypto'
import type { Context, MiddlewareHandler } from 'hono'
import type { BffEnv } from './types.ts'

export interface InternalUser {
  sub: string
  roles: string[]
}

function keysMatch(actual: string | undefined, expected: string): boolean {
  if (!actual) return false
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

export function createInternalAuthentication(internalGatewayKey: string): MiddlewareHandler<BffEnv> {
  return async (c, next) => {
    const sub = c.req.header('x-authenticated-subject')
    if (!keysMatch(c.req.header('x-internal-gateway-key'), internalGatewayKey) ||
      !sub || !/^[A-Za-z0-9._:@-]{1,128}$/.test(sub)) {
      return c.json({ error: 'unauthorized', message: 'Requisição interna não autenticada.' }, 401)
    }
    const rawRoles = c.req.header('x-authenticated-roles') ?? ''
    const roles = rawRoles === '' ? [] : rawRoles.split(',').filter((role) => /^[A-Za-z0-9:_-]{1,64}$/.test(role))
    c.set('auth', { sub, roles } satisfies InternalUser)
    await next()
  }
}

export function authenticatedSubject(c: Context<BffEnv>): string {
  return c.get('auth').sub
}
