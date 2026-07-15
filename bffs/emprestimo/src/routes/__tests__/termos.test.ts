import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createTermosRouter } from '../termos.ts'
import type { BffEnv } from '../../types.ts'

function buildApp() {
  const app = new Hono<BffEnv>()
  app.use(async (c, next) => {
    c.set('auth', { sub: 'user1', roles: [] })
    await next()
  })
  app.route('/', createTermosRouter())
  return app
}

describe('rotas de termos', () => {
  it('GET /termos/:tipo retorna o termo em camelCase para cada tipo válido', async () => {
    const app = buildApp()
    const proposta = await app.request('/termos/PropostaWeb')
    expect(await proposta.json()).toMatchObject({ tipoDoTermo: 'PROPOSTA_WEB' })

    const compart = await app.request('/termos/AutorizacaoConsultaDadosDoTrabalhador')
    expect(await compart.json()).toMatchObject({ tipoDoTermo: 'TERMO_COMPARTILHAMENTO' })

    const cadastrais = await app.request('/termos/CONSENTIMENTO_DADOS_CADASTRAIS')
    expect(await cadastrais.json()).toMatchObject({ tipoDoTermo: 'CONSENTIMENTO_DADOS_CADASTRAIS' })
  })

  it('GET /termos/:tipo responde 404 para um tipo desconhecido', async () => {
    const res = await buildApp().request('/termos/TipoInexistente')
    expect(res.status).toBe(404)
  })

  it('POST /termos/preencher-variaveis retorna o texto fixo', async () => {
    const res = await buildApp().request('/termos/preencher-variaveis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoDoTermo: 'PROPOSTA_WEB' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toBe('Texto do termo preenchido.')
  })

  it('POST /termos/assinar retorna true', async () => {
    const res = await buildApp().request('/termos/assinar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoDoTermoDeAceite: 'PROPOSTA_WEB', sistemaDeOrigem: 'WEB' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toBe(true)
  })

  it('GET /dados-trabalhador retorna os dados em camelCase', async () => {
    const res = await buildApp().request('/dados-trabalhador')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ possuiAutorizacaoParaConsulta: true, valorBaseMargem: 1800, valorMargemDisponivel: 980.5 })
  })
})
