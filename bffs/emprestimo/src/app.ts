import express from 'express'
import type { Application } from 'express'
import { createConsultasRouter } from './routes/consultas.ts'
import { createContratosRouter } from './routes/contratos.ts'
import { createPropostasRouter } from './routes/propostas.ts'
import { createSimulacaoRouter } from './routes/simulacao.ts'
import { createTermosRouter } from './routes/termos.ts'

export function createApp(): Application {
  const app = express()
  app.use(express.json())
  app.use(createContratosRouter())
  app.use(createPropostasRouter())
  app.use(createConsultasRouter())
  app.use(createSimulacaoRouter())
  app.use(createTermosRouter())
  return app
}
