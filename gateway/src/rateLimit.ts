import rateLimit from 'express-rate-limit'
import type { Request, RequestHandler, Response } from 'express'

export interface RateLimitOptions {
  windowMs: number
  globalMax: number
  mutatingMax: number
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

function tooManyRequests(_req: Request, res: Response): void {
  res.status(429).json({
    error: 'rate_limit_exceeded',
    message: 'Limite de requisições excedido.',
    correlationId: res.locals.correlationId as string,
  })
}

export function createRateLimiters(
  opts: RateLimitOptions,
): { global: RequestHandler; mutating: RequestHandler } {
  const global = rateLimit({
    windowMs: opts.windowMs,
    limit: opts.globalMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
  })

  const mutating = rateLimit({
    windowMs: opts.windowMs,
    limit: opts.mutatingMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequests,
    skip: (req) => !MUTATING_METHODS.has(req.method),
  })

  return { global, mutating }
}
