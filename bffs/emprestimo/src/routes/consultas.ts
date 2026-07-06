import { Router } from 'express'
import { obterAtraso, obterDetalhamento, obterExtrato, obterPrevisao } from '../legacyBackend.ts'
import { toMovimento, toParcelaAtraso, toParcelaDetalhe, toParcelaPrevista } from '../transform.ts'

export function createConsultasRouter(): Router {
  const router = Router()

  router.get('/contratos/:id/extrato', (_req, res) => {
    res.json(obterExtrato().map(toMovimento))
  })

  router.get('/contratos/:id/previsao', (_req, res) => {
    res.json(obterPrevisao().map(toParcelaPrevista))
  })

  router.get('/contratos/:id/parcelas', (_req, res) => {
    res.json(obterDetalhamento().map(toParcelaDetalhe))
  })

  router.get('/contratos/:id/atraso', (_req, res) => {
    res.json(obterAtraso().map(toParcelaAtraso))
  })

  return router
}
