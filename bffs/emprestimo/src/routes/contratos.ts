import { Router } from 'express'
import { listarContratos, obterContrato } from '../legacyBackend.ts'
import { toContrato } from '../transform.ts'
import { authenticatedSubject } from '../auth.ts'
import { isResourceId } from '../validation.ts'

export function createContratosRouter(): Router {
  const router = Router()

  router.get('/contratos', (_req, res) => {
    res.json(listarContratos(authenticatedSubject(res)).map(toContrato))
  })

  router.get('/contratos/:id', (req, res) => {
    const owner = authenticatedSubject(res)
    if (!isResourceId(req.params.id)) {
      res.status(400).json({ error: 'invalid_request', message: 'Identificador de contrato inválido.' })
      return
    }
    const contrato = obterContrato(owner, req.params.id)
    if (!contrato) {
      res.status(404).json({ error: 'not_found', message: 'Contrato não encontrado.' })
      return
    }
    res.json(toContrato(contrato))
  })

  return router
}
