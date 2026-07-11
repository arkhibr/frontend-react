import express from 'express'
import type { Application } from 'express'
import { createConsultasRouter } from './routes/consultas.ts'
import { createContratosRouter } from './routes/contratos.ts'
import { createPropostasRouter } from './routes/propostas.ts'
import { createSimulacaoRouter } from './routes/simulacao.ts'
import { createTermosRouter } from './routes/termos.ts'
import { createInternalAuthentication } from './auth.ts'
import type { BffConfig } from './config.ts'

export function createApp(config: Pick<BffConfig, 'internalGatewayKey'>): Application {
  const app = express()
  app.use(express.json({ limit: '16kb', strict: true }))
  app.use(createInternalAuthentication(config.internalGatewayKey))
  app.use(createContratosRouter())
  app.use(createPropostasRouter())
  app.use(createConsultasRouter())
  app.use(createSimulacaoRouter())
  app.use(createTermosRouter())
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
