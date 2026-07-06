import express from 'express'
import type { Application } from 'express'
import { createRoutes } from './routes.ts'

export function createApp(): Application {
  const app = express()
  app.use(express.json())
  app.use(createRoutes())
  return app
}
