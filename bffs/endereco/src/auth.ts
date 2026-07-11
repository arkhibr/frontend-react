import { timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'

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
    res.locals.auth = { sub }
    next()
  }
}
