import express from 'express'
import type { Application } from 'express'
import { createRoutes } from './routes.ts'
import { createInternalAuthentication } from './auth.ts'
import type { BffConfig } from './config.ts'

export function createApp(config: Pick<BffConfig, 'internalGatewayKey'>): Application {
  const app = express()
  app.use(express.json({ limit: '16kb', strict: true }))
  app.use(createInternalAuthentication(config.internalGatewayKey))
  app.use(createRoutes())
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'invalid_json', message: 'JSON inválido.' })
      return
    }
    if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({ error: 'payload_too_large', message: 'Payload excede o limite permitido.' })
      return
    }
    next(err)
  })
  return app
}
