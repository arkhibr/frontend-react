import { Hono } from 'hono'
import { assinarTermo, obterDadosTrabalhador, obterTermo, preencherVariaveis } from '../legacyBackend.ts'
import { toDadosTrabalhador, toTermoConsentimento } from '../transform.ts'
import { authenticatedSubject } from '../auth.ts'
import { isFixtureOwner } from '../legacyBackend.ts'
import { validateAssinatura, validateTermo } from '../validation.ts'
import type { BffEnv } from '../types.ts'

const TIPOS_DE_TERMO = ['PropostaWeb', 'AutorizacaoConsultaDadosDoTrabalhador', 'CONSENTIMENTO_DADOS_CADASTRAIS'] as const
type TipoDeTermo = (typeof TIPOS_DE_TERMO)[number]

function isTipoDeTermo(valor: string): valor is TipoDeTermo {
  return (TIPOS_DE_TERMO as readonly string[]).includes(valor)
}

export function createTermosRouter(): Hono<BffEnv> {
  const router = new Hono<BffEnv>()

  router.get('/termos/:tipo', (c) => {
    const tipo = c.req.param('tipo')
    if (!isTipoDeTermo(tipo)) {
      return c.json({ error: 'not_found', message: 'Tipo de termo desconhecido.' }, 404)
    }
    return c.json(toTermoConsentimento(obterTermo(tipo)))
  })

  router.post('/termos/preencher-variaveis', async (c) => {
    const body = await c.req.json()
    const validation = validateTermo(body)
    if (!validation.ok) {
      return c.json({ error: 'invalid_request', message: validation.message }, 400)
    }
    return c.json(preencherVariaveis())
  })

  router.post('/termos/assinar', async (c) => {
    const body = await c.req.json()
    const validation = validateAssinatura(body)
    if (!validation.ok) {
      return c.json({ error: 'invalid_request', message: validation.message }, 400)
    }
    return c.json(assinarTermo())
  })

  router.get('/dados-trabalhador', (c) => {
    if (!isFixtureOwner(authenticatedSubject(c))) {
      return c.json({ error: 'not_found', message: 'Dados não encontrados.' }, 404)
    }
    return c.json(toDadosTrabalhador(obterDadosTrabalhador()))
  })

  return router
}
