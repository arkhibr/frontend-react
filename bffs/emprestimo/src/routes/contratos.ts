import { Hono } from 'hono'
import { listarContratos, obterContrato } from '../legacyBackend.ts'
import { toContrato } from '../transform.ts'
import { authenticatedSubject } from '../auth.ts'
import { isResourceId } from '../validation.ts'
import type { BffEnv } from '../types.ts'

export function createContratosRouter(): Hono<BffEnv> {
  const router = new Hono<BffEnv>()

  router.get('/contratos', (c) => {
    return c.json(listarContratos(authenticatedSubject(c)).map(toContrato))
  })

  router.get('/contratos/:id', (c) => {
    const owner = authenticatedSubject(c)
    const id = c.req.param('id')
    if (!isResourceId(id)) {
      return c.json({ error: 'invalid_request', message: 'Identificador de contrato inválido.' }, 400)
    }
    const contrato = obterContrato(owner, id)
    if (!contrato) {
      return c.json({ error: 'not_found', message: 'Contrato não encontrado.' }, 404)
    }
    return c.json(toContrato(contrato))
  })

  return router
}
