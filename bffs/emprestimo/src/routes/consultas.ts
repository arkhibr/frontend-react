import { Router, type Request, type Response } from 'express'
import { obterAtraso, obterDetalhamento, obterExtrato, obterPrevisao, podeAcessarContrato } from '../legacyBackend.ts'
import { toMovimento, toParcelaAtraso, toParcelaDetalhe, toParcelaPrevista } from '../transform.ts'
import { authenticatedSubject } from '../auth.ts'
import { isResourceId } from '../validation.ts'

export function createConsultasRouter(): Router {
  const router = Router()

  function authorizeContract(req: Request, res: Response): boolean {
    const id = typeof req.params.id === 'string' ? req.params.id : ''
    if (!isResourceId(id) || !podeAcessarContrato(authenticatedSubject(res), id)) {
      res.status(404).json({ error: 'not_found', message: 'Contrato não encontrado.' })
      return false
    }
    return true
  }

  router.get('/contratos/:id/extrato', (req, res) => {
    if (!authorizeContract(req, res)) return
    res.json(obterExtrato().map(toMovimento))
  })

  router.get('/contratos/:id/previsao', (req, res) => {
    if (!authorizeContract(req, res)) return
    res.json(obterPrevisao().map(toParcelaPrevista))
  })

  router.get('/contratos/:id/parcelas', (req, res) => {
    if (!authorizeContract(req, res)) return
    res.json(obterDetalhamento().map(toParcelaDetalhe))
  })

  router.get('/contratos/:id/atraso', (req, res) => {
    if (!authorizeContract(req, res)) return
    res.json(obterAtraso().map(toParcelaAtraso))
  })

  return router
}
