import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { resolveTarget } from './routing.ts'

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

export function createAuditLog(logPath: string, bffs: Record<string, string>): RequestHandler {
  mkdirSync(dirname(logPath), { recursive: true })

  return function auditLog(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint()

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - startedAt
      const target = resolveTarget(req.path, bffs)

      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        correlationId: (res.locals.correlationId as string | undefined) ?? 'unknown',
        method: req.method,
        path: req.path,
        targetBff: target?.name ?? null,
        status: res.statusCode,
        durationMs: Math.round(Number(durationNs) / 1000) / 1000,
        clientIp: req.ip ?? 'unknown',
      }

      try {
        appendFileSync(logPath, `${JSON.stringify(entry)}\n`)
      } catch (error) {
        console.error(
          '[audit] failed to write audit entry',
          { error, entry: entry.correlationId },
          error instanceof Error ? error.message : String(error),
        )
      }
    })

    next()
  }
}
