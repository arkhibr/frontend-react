import { Router } from 'express'
import { criarProposta, excluirProposta, listarPropostas, respostaInsercaoProposta } from '../legacyBackend.ts'
import { fromSolicitacaoDeProposta, toProposta } from '../transform.ts'
import type { SolicitacaoDeProposta } from '../domain.ts'
import { authenticatedSubject } from '../auth.ts'
import { isResourceId, validateProposal } from '../validation.ts'

export function createPropostasRouter(): Router {
  const router = Router()

  router.get('/propostas', (_req, res) => {
    res.json(listarPropostas(authenticatedSubject(res)).map(toProposta))
  })

  router.delete('/propostas/:id', (req, res) => {
    if (!isResourceId(req.params.id)) {
      res.status(400).json({ error: 'invalid_request', message: 'Identificador de proposta inválido.' })
      return
    }
    const deleted = excluirProposta(authenticatedSubject(res), req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'not_found', message: 'Proposta não encontrada.' })
      return
    }
    res.status(204).end()
  })

  router.post('/propostas', (req, res) => {
    const validation = validateProposal(req.body as SolicitacaoDeProposta)
    if (!validation.ok) {
      res.status(400).json({ error: 'invalid_request', message: validation.message })
      return
    }
    const proposta = criarProposta(authenticatedSubject(res), fromSolicitacaoDeProposta(validation.value))
    res.status(201).json(respostaInsercaoProposta(proposta.Contrato))
  })

  return router
}
