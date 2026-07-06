import { Router } from 'express'
import { getEndereco, putEndereco } from './legacyBackend.ts'
import type { Endereco } from './legacyBackend.ts'

export function createRoutes(): Router {
  const router = Router()

  router.get('/usuario/endereco', (_req, res) => {
    res.json(getEndereco())
  })

  router.put('/usuario/endereco', (req, res) => {
    res.json(putEndereco(req.body as Endereco))
  })

  return router
}
