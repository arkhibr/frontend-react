import { describe, it, expect } from 'vitest'
import { loadConfig } from '../config.ts'

describe('loadConfig', () => {
  it('usa valores padrão quando nenhuma env var é definida', () => {
    const config = loadConfig({})

    expect(config.port).toBe(4000)
    expect(config.corsOrigin).toBe('http://localhost:5173')
    expect(config.bffs.emprestimo).toBe('http://localhost:4001')
    expect(config.bffs.endereco).toBe('http://localhost:4002')
    expect(config.rateLimit.windowMs).toBe(60_000)
    expect(config.rateLimit.globalMax).toBe(100)
    expect(config.rateLimit.mutatingMax).toBe(20)
    expect(config.auditLogPath).toBe('logs/audit.log')
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
    })

    expect(config.port).toBe(5000)
    expect(config.corsOrigin).toBe('https://portal.exemplo.com')
    expect(config.bffs.emprestimo).toBe('http://bff-emprestimo:4001')
    expect(config.bffs.endereco).toBe('http://bff-endereco:4002')
    expect(config.rateLimit.globalMax).toBe(50)
    expect(config.rateLimit.mutatingMax).toBe(5)
    expect(config.auditLogPath).toBe('/var/log/gateway/audit.log')
  })

  it('cai no padrão quando uma env var numérica é malformada', () => {
    const config = loadConfig({
      PORT: 'abc',
      RATE_LIMIT_GLOBAL_MAX: 'abc',
    })

    expect(config.port).toBe(4000)
    expect(config.rateLimit.globalMax).toBe(100)
    expect(Number.isNaN(config.rateLimit.globalMax)).toBe(false)
  })
})
