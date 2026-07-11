import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import type { RequestHandler } from 'express'
import type { GatewayConfig } from './config.ts'

export interface AuthenticatedUser {
  sub: string
  roles: string[]
}

function userFromPayload(payload: JWTPayload): AuthenticatedUser | null {
  if (typeof payload.sub !== 'string' || !/^[A-Za-z0-9._:@-]{1,128}$/.test(payload.sub)) return null
  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((role: unknown): role is string => typeof role === 'string' && role.length <= 64)
    : []
  return { sub: payload.sub, roles }
}

export function createAuthentication(config: GatewayConfig['auth']): RequestHandler {
  const remoteJwks = config.jwksUrl ? createRemoteJWKSet(new URL(config.jwksUrl)) : null
  const sharedSecret = config.sharedSecret ? new TextEncoder().encode(config.sharedSecret) : null

  return async (req, res, next) => {
    const authorization = req.header('authorization')
    const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/)
    if (!match) {
      res.status(401).json({ error: 'unauthorized', message: 'Token Bearer ausente ou inválido.' })
      return
    }

    try {
      const options = { issuer: config.issuer, audience: config.audience }
      const { payload } = remoteJwks
        ? await jwtVerify(match[1], remoteJwks, { ...options, algorithms: ['RS256'] })
        : await jwtVerify(match[1], sharedSecret!, { ...options, algorithms: ['HS256'] })
      const user = userFromPayload(payload)
      if (!user) throw new Error('claims inválidos')
      res.locals.auth = user
      next()
    } catch {
      res.status(401).json({ error: 'unauthorized', message: 'Token Bearer ausente ou inválido.' })
    }
  }
}
