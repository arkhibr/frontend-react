import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createTermosRouter } from '../termos.ts'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(createTermosRouter())
  return app
}

describe('rotas de termos', () => {
  it('GET /termos/:tipo retorna o termo em camelCase para cada tipo válido', async () => {
    const proposta = await request(buildApp()).get('/termos/PropostaWeb')
    expect(proposta.body).toMatchObject({ tipoDoTermo: 'PROPOSTA_WEB' })

    const compart = await request(buildApp()).get('/termos/AutorizacaoConsultaDadosDoTrabalhador')
    expect(compart.body).toMatchObject({ tipoDoTermo: 'TERMO_COMPARTILHAMENTO' })

    const cadastrais = await request(buildApp()).get('/termos/CONSENTIMENTO_DADOS_CADASTRAIS')
    expect(cadastrais.body).toMatchObject({ tipoDoTermo: 'CONSENTIMENTO_DADOS_CADASTRAIS' })
  })

  it('GET /termos/:tipo responde 404 para um tipo desconhecido', async () => {
    const res = await request(buildApp()).get('/termos/TipoInexistente')
    expect(res.status).toBe(404)
  })

  it('POST /termos/preencher-variaveis retorna o texto fixo', async () => {
    const res = await request(buildApp()).post('/termos/preencher-variaveis').send({ tipoDoTermo: 'PROPOSTA_WEB' })
    expect(res.status).toBe(200)
    expect(res.body).toBe('Texto do termo preenchido.')
  })

  it('POST /termos/assinar retorna true', async () => {
    const res = await request(buildApp()).post('/termos/assinar').send({ tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB' })
    expect(res.status).toBe(200)
    expect(res.body).toBe(true)
  })

  it('GET /dados-trabalhador retorna os dados em camelCase', async () => {
    const res = await request(buildApp()).get('/dados-trabalhador')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ possuiAutorizacaoParaConsulta: true, valorBaseMargem: 1800, valorMargemDisponivel: 980.5 })
  })
})
