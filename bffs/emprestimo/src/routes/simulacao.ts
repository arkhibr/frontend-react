import { Hono } from 'hono'
import { obterParametrosSimulacao, obterPrimeiroVencimento, simularMultiplas } from '../legacyBackend.ts'
import { toDataVencimentoContratosAptos, toEmprestimoSimulado, toLinhaDeCredito } from '../transform.ts'
import { validateSimulacao } from '../validation.ts'
import type { BffEnv } from '../types.ts'

export function createSimulacaoRouter(): Hono<BffEnv> {
  const router = new Hono<BffEnv>()

  router.get('/simulacao/parametros', (c) => {
    return c.json(obterParametrosSimulacao().map(toLinhaDeCredito))
  })

  router.get('/simulacao/primeiro-vencimento', (c) => {
    return c.json(toDataVencimentoContratosAptos(obterPrimeiroVencimento()))
  })

  router.post('/simulacao/multiplas', async (c) => {
    const body = await c.req.json()
    const validation = validateSimulacao(body)
    if (!validation.ok) {
      return c.json({ error: 'invalid_request', message: validation.message }, 400)
    }
    return c.json(simularMultiplas().map(toEmprestimoSimulado))
  })

  return router
}
