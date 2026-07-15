import { appendFile, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { MiddlewareHandler } from 'hono'
import { resolveTarget } from './routing.ts'
import type { GatewayEnv } from './types.ts'

export interface AuditEntry {
  timestamp: string
  correlationId: string
  method: string
  path: string
  targetBff: string | null
  status: number
  durationMs: number
  clientIp: string
}

export function createAuditLog(logPath: string, bffs: Record<string, string>): MiddlewareHandler<GatewayEnv> {
  mkdirSync(dirname(logPath), { recursive: true })

  return async (c, next) => {
    const startedAt = process.hrtime.bigint()
    const capturedMethod = c.req.method
    const capturedPath = c.req.path
    const capturedTarget = resolveTarget(capturedPath, bffs)

    await next()

    const durationNs = process.hrtime.bigint() - startedAt
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      correlationId: c.get('correlationId') ?? 'unknown',
      method: capturedMethod,
      path: capturedPath,
      targetBff: capturedTarget?.name ?? null,
      status: c.res.status,
      durationMs: Math.round(Number(durationNs) / 1000) / 1000,
      clientIp: c.req.header('x-forwarded-for') ?? 'unknown',
    }

    try {
      appendFile(logPath, `${JSON.stringify(entry)}\n`, (error) => {
        if (error) console.error('[audit] failed to write audit entry', { entry: entry.correlationId }, error.message)
      })
    } catch (error) {
      console.error('[audit] failed to enqueue audit entry', { entry: entry.correlationId }, String(error))
    }
  }
}
