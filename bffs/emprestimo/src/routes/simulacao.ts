import { Router } from 'express'
import { obterParametrosSimulacao, obterPrimeiroVencimento, simularMultiplas } from '../legacyBackend.ts'
import { toDataVencimentoContratosAptos, toEmprestimoSimulado, toLinhaDeCredito } from '../transform.ts'
import { validateSimulacao } from '../validation.ts'

export function createSimulacaoRouter(): Router {
  const router = Router()

  router.get('/simulacao/parametros', (_req, res) => {
    res.json(obterParametrosSimulacao().map(toLinhaDeCredito))
  })

  router.get('/simulacao/primeiro-vencimento', (_req, res) => {
    res.json(toDataVencimentoContratosAptos(obterPrimeiroVencimento()))
  })

  router.post('/simulacao/multiplas', (req, res) => {
    const validation = validateSimulacao(req.body)
    if (!validation.ok) {
      res.status(400).json({ error: 'invalid_request', message: validation.message })
      return
    }
    res.json(simularMultiplas().map(toEmprestimoSimulado))
  })

  return router
}
