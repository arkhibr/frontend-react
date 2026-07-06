import { Router } from 'express'
import { listarContratos, obterContrato } from '../legacyBackend.ts'
import { toContrato } from '../transform.ts'

export function createContratosRouter(): Router {
  const router = Router()

  router.get('/contratos', (_req, res) => {
    res.json(listarContratos().map(toContrato))
  })

  router.get('/contratos/:id', (req, res) => {
    res.json(toContrato(obterContrato(req.params.id)))
  })

  return router
}
