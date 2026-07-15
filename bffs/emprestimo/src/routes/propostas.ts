import { Hono } from 'hono'
import { criarProposta, excluirProposta, listarPropostas, respostaInsercaoProposta } from '../legacyBackend.ts'
import { fromSolicitacaoDeProposta, toProposta } from '../transform.ts'
import type { SolicitacaoDeProposta } from '../domain.ts'
import { authenticatedSubject } from '../auth.ts'
import { isResourceId, validateProposal } from '../validation.ts'
import type { BffEnv } from '../types.ts'

export function createPropostasRouter(): Hono<BffEnv> {
  const router = new Hono<BffEnv>()

  router.get('/propostas', (c) => {
    return c.json(listarPropostas(authenticatedSubject(c)).map(toProposta))
  })

  router.delete('/propostas/:id', (c) => {
    const id = c.req.param('id')
    if (!isResourceId(id)) {
      return c.json({ error: 'invalid_request', message: 'Identificador de proposta inválido.' }, 400)
    }
    const deleted = excluirProposta(authenticatedSubject(c), id)
    if (!deleted) {
      return c.json({ error: 'not_found', message: 'Proposta não encontrada.' }, 404)
    }
    return c.body(null, 204)
  })

  router.post('/propostas', async (c) => {
    const body = (await c.req.json()) as SolicitacaoDeProposta
    const validation = validateProposal(body)
    if (!validation.ok) {
      return c.json({ error: 'invalid_request', message: validation.message }, 400)
    }
    const proposta = criarProposta(authenticatedSubject(c), fromSolicitacaoDeProposta(validation.value))
    return c.json(respostaInsercaoProposta(proposta.Contrato), 201)
  })

  return router
}
