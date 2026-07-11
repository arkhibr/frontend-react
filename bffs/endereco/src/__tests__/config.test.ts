import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config.ts'

describe('loadConfig', () => {
  it('usa a porta padrão quando PORT não é definida', () => {
    expect(loadConfig({}).port).toBe(4002)
    expect(loadConfig({}).internalGatewayKey).toBe('development-only-gateway-key')
  })

  it('usa PORT quando definida', () => {
    expect(loadConfig({ PORT: '9000' }).port).toBe(9000)
  })

  it('cai no padrão quando PORT é malformada', () => {
    expect(loadConfig({ PORT: 'abc' }).port).toBe(4002)
  })

  it('falha em produção sem chave interna', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/INTERNAL_GATEWAY_KEY/)
  })
})
