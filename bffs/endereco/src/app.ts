import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createRoutes } from './routes.ts'
import { createInternalAuthentication } from './auth.ts'
import type { BffConfig } from './config.ts'
import type { BffEnv } from './types.ts'

export function createApp(config: Pick<BffConfig, 'internalGatewayKey'>): Hono<BffEnv> {
  const app = new Hono<BffEnv>()

  app.use(
    bodyLimit({
      maxSize: 16 * 1024,
      onError: (c) => c.json({ error: 'payload_too_large', message: 'Payload excede o limite permitido.' }, 413),
    }),
  )
  app.use(createInternalAuthentication(config.internalGatewayKey))
  app.route('/', createRoutes())

  app.onError((err, c) => {
    if (err instanceof SyntaxError) {
      return c.json({ error: 'invalid_json', message: 'JSON inválido.' }, 400)
    }
    throw err
  })

  return app
}
