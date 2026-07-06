import { Router } from 'express'
import { assinarTermo, obterDadosTrabalhador, obterTermo, preencherVariaveis } from '../legacyBackend.ts'
import { toDadosTrabalhador, toTermoConsentimento } from '../transform.ts'

const TIPOS_DE_TERMO = ['PropostaWeb', 'AutorizacaoConsultaDadosDoTrabalhador', 'CONSENTIMENTO_DADOS_CADASTRAIS'] as const
type TipoDeTermo = (typeof TIPOS_DE_TERMO)[number]

function isTipoDeTermo(valor: string): valor is TipoDeTermo {
  return (TIPOS_DE_TERMO as readonly string[]).includes(valor)
}

export function createTermosRouter(): Router {
  const router = Router()

  router.get('/termos/:tipo', (req, res) => {
    if (!isTipoDeTermo(req.params.tipo)) {
      res.status(404).json({ error: 'not_found', message: 'Tipo de termo desconhecido.' })
      return
    }
    res.json(toTermoConsentimento(obterTermo(req.params.tipo)))
  })

  router.post('/termos/preencher-variaveis', (_req, res) => {
    res.json(preencherVariaveis())
  })

  router.post('/termos/assinar', (_req, res) => {
    res.json(assinarTermo())
  })

  router.get('/dados-trabalhador', (_req, res) => {
    res.json(toDadosTrabalhador(obterDadosTrabalhador()))
  })

  return router
}
