import { Hono } from 'hono'
import type { Context } from 'hono'
import { obterAtraso, obterDetalhamento, obterExtrato, obterPrevisao, podeAcessarContrato } from '../legacyBackend.ts'
import { toMovimento, toParcelaAtraso, toParcelaDetalhe, toParcelaPrevista } from '../transform.ts'
import { authenticatedSubject } from '../auth.ts'
import { isResourceId } from '../validation.ts'
import type { BffEnv } from '../types.ts'

export function createConsultasRouter(): Hono<BffEnv> {
  const router = new Hono<BffEnv>()

  function authorizeContract(c: Context<BffEnv>): boolean {
    const id = c.req.param('id') ?? ''
    return isResourceId(id) && podeAcessarContrato(authenticatedSubject(c), id)
  }

  function notFound(c: Context<BffEnv>) {
    return c.json({ error: 'not_found', message: 'Contrato não encontrado.' }, 404)
  }

  router.get('/contratos/:id/extrato', (c) => {
    if (!authorizeContract(c)) return notFound(c)
    return c.json(obterExtrato().map(toMovimento))
  })

  router.get('/contratos/:id/previsao', (c) => {
    if (!authorizeContract(c)) return notFound(c)
    return c.json(obterPrevisao().map(toParcelaPrevista))
  })

  router.get('/contratos/:id/parcelas', (c) => {
    if (!authorizeContract(c)) return notFound(c)
    return c.json(obterDetalhamento().map(toParcelaDetalhe))
  })

  router.get('/contratos/:id/atraso', (c) => {
    if (!authorizeContract(c)) return notFound(c)
    return c.json(obterAtraso().map(toParcelaAtraso))
  })

  return router
}
