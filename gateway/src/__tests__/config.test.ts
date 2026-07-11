import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config.ts'

describe('loadConfig', () => {
  it('usa valores de desenvolvimento quando o segredo JWT é configurado', () => {
    const config = loadConfig({ JWT_SHARED_SECRET: 'dev-secret' })

    expect(config.port).toBe(4000)
    expect(config.corsOrigin).toBe('http://localhost:5173')
    expect(config.bffs.emprestimo).toBe('http://localhost:4001')
    expect(config.bffs.endereco).toBe('http://localhost:4002')
    expect(config.rateLimit.windowMs).toBe(60_000)
    expect(config.rateLimit.globalMax).toBe(100)
    expect(config.rateLimit.mutatingMax).toBe(20)
    expect(config.auditLogPath).toBe('logs/audit.log')
    expect(config.auth).toMatchObject({ issuer: 'portal-dev', audience: 'portal-api', sharedSecret: 'dev-secret' })
  })

  it('usa valores de env var quando definidos', () => {
    const config = loadConfig({
      PORT: '5000',
      CORS_ORIGIN: 'https://portal.exemplo.com',
      BFF_EMPRESTIMO_URL: 'http://bff-emprestimo:4001',
      BFF_ENDERECO_URL: 'http://bff-endereco:4002',
      RATE_LIMIT_GLOBAL_MAX: '50',
      RATE_LIMIT_MUTATING_MAX: '5',
      AUDIT_LOG_PATH: '/var/log/gateway/audit.log',
      JWT_SHARED_SECRET: 'secret',
      JWT_ISSUER: 'issuer',
      JWT_AUDIENCE: 'audience',
      INTERNAL_GATEWAY_KEY: 'gateway-key',
    })

    expect(config.port).toBe(5000)
    expect(config.corsOrigin).toBe('https://portal.exemplo.com')
    expect(config.bffs.emprestimo).toBe('http://bff-emprestimo:4001')
    expect(config.bffs.endereco).toBe('http://bff-endereco:4002')
    expect(config.rateLimit.globalMax).toBe(50)
    expect(config.rateLimit.mutatingMax).toBe(5)
    expect(config.auditLogPath).toBe('/var/log/gateway/audit.log')
    expect(config.auth).toMatchObject({ issuer: 'issuer', audience: 'audience', sharedSecret: 'secret' })
    expect(config.internalGatewayKey).toBe('gateway-key')
  })

  it('cai no padrão quando uma env var numérica é malformada', () => {
    const config = loadConfig({
      PORT: 'abc',
      RATE_LIMIT_GLOBAL_MAX: 'abc',
      JWT_SHARED_SECRET: 'secret',
    })

    expect(config.port).toBe(4000)
    expect(config.rateLimit.globalMax).toBe(100)
    expect(Number.isNaN(config.rateLimit.globalMax)).toBe(false)
  })

  it('falha sem autenticação configurada e exige JWKS em produção', () => {
    expect(() => loadConfig({})).toThrow(/JWT_JWKS_URL ou JWT_SHARED_SECRET/)
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_ISSUER: 'issuer', JWT_AUDIENCE: 'audience', INTERNAL_GATEWAY_KEY: 'key' }))
      .toThrow(/JWT_JWKS_URL/)
  })
})
