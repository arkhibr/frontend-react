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
    // Capturados de forma síncrona, antes de next(): uma vez que a requisição entra em um
    // sub-router montado em prefixo (ex.: proxy para /bff/<nome>), o Express reescreve
    // req.url/req.path removendo o prefixo, e só o restaura se o handler montado chamar
    // next(). O proxy real finaliza a resposta diretamente, sem chamar next(), então
    // ler req.path/req.method dentro do callback 'finish' pegaria o valor já mutado.
    const capturedMethod = req.method
    const capturedPath = req.path
    const capturedClientIp = req.ip ?? 'unknown'
    const capturedTarget = resolveTarget(capturedPath, bffs)

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - startedAt

      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        correlationId: (res.locals.correlationId as string | undefined) ?? 'unknown',
        method: capturedMethod,
        path: capturedPath,
        targetBff: capturedTarget?.name ?? null,
        status: res.statusCode,
        durationMs: Math.round(Number(durationNs) / 1000) / 1000,
        clientIp: capturedClientIp,
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
