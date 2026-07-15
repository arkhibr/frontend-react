import { Hono } from 'hono'
import { getEndereco, putEndereco } from './legacyBackend.ts'
import type { Endereco } from './legacyBackend.ts'
import { validateEndereco } from './validation.ts'
import type { BffEnv } from './types.ts'

export function createRoutes(): Hono<BffEnv> {
  const router = new Hono<BffEnv>()

  router.get('/usuario/endereco', (c) => {
    return c.json(getEndereco())
  })

  router.put('/usuario/endereco', async (c) => {
    const body = (await c.req.json()) as Endereco
    const validation = validateEndereco(body)
    if (!validation.ok) {
      return c.json({ error: 'invalid_request', message: validation.message }, 400)
    }
    return c.json(putEndereco(validation.value))
  })

  return router
}
