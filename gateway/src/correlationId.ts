import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-correlation-id')
  const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID()
  res.locals.correlationId = id
  res.setHeader('X-Correlation-Id', id)
  next()
}
