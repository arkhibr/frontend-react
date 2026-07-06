import { Router } from 'express'
import { criarProposta, excluirProposta, listarPropostas, respostaInsercaoProposta } from '../legacyBackend.ts'
import { fromSolicitacaoDeProposta, toProposta } from '../transform.ts'
import type { SolicitacaoDeProposta } from '../domain.ts'

export function createPropostasRouter(): Router {
  const router = Router()

  router.get('/propostas', (_req, res) => {
    res.json(listarPropostas().map(toProposta))
  })

  router.delete('/propostas/:id', (req, res) => {
    res.json(excluirProposta(req.params.id))
  })

  router.post('/propostas', (req, res) => {
    const body = req.body as SolicitacaoDeProposta
    const proposta = criarProposta(fromSolicitacaoDeProposta(body))
    res.json(respostaInsercaoProposta(proposta.Contrato))
  })

  return router
}
