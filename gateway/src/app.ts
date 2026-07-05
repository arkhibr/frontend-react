import cors from 'cors'
import express from 'express'
import type { Application } from 'express'
import { correlationId } from './correlationId.ts'
import { createAuditLog } from './auditLog.ts'
import { createRateLimiters } from './rateLimit.ts'
import { createProxyRouter } from './proxy.ts'
import type { GatewayConfig } from './config.ts'

export function createApp(config: GatewayConfig): Application {
  const app = express()

  app.use(correlationId)
  app.use(cors({ origin: config.corsOrigin }))
  app.use(createAuditLog(config.auditLogPath, config.bffs))

  const { global, mutating } = createRateLimiters(config.rateLimit)
  app.use(global)
  app.use(mutating)

  app.use(createProxyRouter(config.bffs))

  return app
}
