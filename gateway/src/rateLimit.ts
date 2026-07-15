import type { MiddlewareHandler } from 'hono'
import type { GatewayEnv } from './types.ts'

export interface RateLimitOptions {
  windowMs: number
  globalMax: number
  mutatingMax: number
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

interface Bucket {
  count: number
  resetAt: number
}

function createLimiter(opts: {
  windowMs: number
  max: number
  keyPrefix: string
  applies: (method: string) => boolean
}): MiddlewareHandler<GatewayEnv> {
  const buckets = new Map<string, Bucket>()

  return async (c, next) => {
    if (!opts.applies(c.req.method)) {
      await next()
      return
    }

    const now = Date.now()
    const identity = c.get('auth')?.sub ?? c.req.header('x-forwarded-for') ?? 'unknown'
    const key = `${opts.keyPrefix}:${identity}`
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
      await next()
      return
    }

    if (bucket.count >= opts.max) {
      return c.json({
        error: 'rate_limit_exceeded',
        message: 'Limite de requisições excedido.',
        correlationId: c.get('correlationId') ?? 'unknown',
      }, 429)
    }

    bucket.count += 1
    await next()
  }
}

export function createRateLimiters(
  opts: RateLimitOptions,
): { global: MiddlewareHandler<GatewayEnv>; mutating: MiddlewareHandler<GatewayEnv> } {
  const global = createLimiter({ windowMs: opts.windowMs, max: opts.globalMax, keyPrefix: 'global', applies: () => true })
  const mutating = createLimiter({
    windowMs: opts.windowMs,
    max: opts.mutatingMax,
    keyPrefix: 'mutating',
    applies: (method) => MUTATING_METHODS.has(method),
  })
  return { global, mutating }
}
