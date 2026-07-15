import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { correlationId } from './correlationId.ts'
import { createAuditLog } from './auditLog.ts'
import { createRateLimiters } from './rateLimit.ts'
import { createProxyRouter } from './proxy.ts'
import { createAuthentication } from './auth.ts'
import type { GatewayConfig } from './config.ts'
import type { GatewayEnv } from './types.ts'

export function createApp(config: GatewayConfig): Hono<GatewayEnv> {
  const app = new Hono<GatewayEnv>()

  app.use(correlationId)
  app.use(cors({ origin: config.corsOrigin }))
  app.use(createAuthentication(config.auth))
  app.use(createAuditLog(config.auditLogPath, config.bffs))

  const { global, mutating } = createRateLimiters(config.rateLimit)
  app.use(global)
  app.use(mutating)

  app.all('*', createProxyRouter(config.bffs, config.internalGatewayKey))

  return app
}
