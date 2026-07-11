import { timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'

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

export function createInternalAuthentication(internalGatewayKey: string): RequestHandler {
  return (req, res, next) => {
    const sub = req.header('x-authenticated-subject')
    if (!keysMatch(req.header('x-internal-gateway-key'), internalGatewayKey) ||
      !sub || !/^[A-Za-z0-9._:@-]{1,128}$/.test(sub)) {
      res.status(401).json({ error: 'unauthorized', message: 'Requisição interna não autenticada.' })
      return
    }
    const rawRoles = req.header('x-authenticated-roles') ?? ''
    const roles = rawRoles === '' ? [] : rawRoles.split(',').filter((role) => /^[A-Za-z0-9:_-]{1,64}$/.test(role))
    res.locals.auth = { sub, roles } satisfies InternalUser
    next()
  }
}

export function authenticatedSubject(res: { locals: Record<string, unknown> }): string {
  return (res.locals.auth as InternalUser).sub
}
