import { Router } from 'express'
import { getEndereco, putEndereco } from './legacyBackend.ts'
import type { Endereco } from './legacyBackend.ts'
import { validateEndereco } from './validation.ts'

export function createRoutes(): Router {
  const router = Router()

  router.get('/usuario/endereco', (_req, res) => {
    res.json(getEndereco())
  })

  router.put('/usuario/endereco', (req, res) => {
    const validation = validateEndereco(req.body as Endereco)
    if (!validation.ok) {
      res.status(400).json({ error: 'invalid_request', message: validation.message })
      return
    }
    res.json(putEndereco(validation.value))
  })

  return router
}
