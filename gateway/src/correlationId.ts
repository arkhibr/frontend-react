import { randomUUID } from 'node:crypto'
import type { MiddlewareHandler } from 'hono'
import type { GatewayEnv } from './types.ts'

export const correlationId: MiddlewareHandler<GatewayEnv> = async (c, next) => {
  const incoming = c.req.header('x-correlation-id')
  const id = incoming && /^[A-Za-z0-9_-]{1,128}$/.test(incoming) ? incoming : randomUUID()
  c.set('correlationId', id)
  c.header('X-Correlation-Id', id)
  await next()
}
