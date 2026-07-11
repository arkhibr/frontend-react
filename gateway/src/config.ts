export interface GatewayConfig {
  port: number
  corsOrigin: string
  bffs: Record<string, string>
  auth: {
    issuer: string
    audience: string
    jwksUrl?: string
    sharedSecret?: string
  }
  internalGatewayKey: string
  trustProxy: boolean
  rateLimit: {
    windowMs: number
    globalMax: number
    mutatingMax: number
  }
  auditLogPath: string
}

function numberEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  return raw !== undefined && Number.isFinite(parsed) ? parsed : fallback
}

function requiredInProduction(env: NodeJS.ProcessEnv, name: string, fallback?: string): string {
  const value = env[name] ?? fallback
  if (!value) throw new Error(`${name} é obrigatório em produção`)
  return value
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const isProduction = env.NODE_ENV === 'production'
  const sharedSecret = env.JWT_SHARED_SECRET
  const jwksUrl = env.JWT_JWKS_URL
  if (isProduction && !jwksUrl) throw new Error('JWT_JWKS_URL é obrigatório em produção')
  if (!isProduction && !jwksUrl && !sharedSecret) {
    throw new Error('Defina JWT_JWKS_URL ou JWT_SHARED_SECRET')
  }

  return {
    port: numberEnv(env.PORT, 4000),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
    bffs: {
      emprestimo: env.BFF_EMPRESTIMO_URL ?? 'http://localhost:4001',
      endereco: env.BFF_ENDERECO_URL ?? 'http://localhost:4002',
    },
    auth: {
      issuer: requiredInProduction(env, 'JWT_ISSUER', isProduction ? undefined : 'portal-dev'),
      audience: requiredInProduction(env, 'JWT_AUDIENCE', isProduction ? undefined : 'portal-api'),
      jwksUrl,
      sharedSecret,
    },
    internalGatewayKey: requiredInProduction(
      env,
      'INTERNAL_GATEWAY_KEY',
      isProduction ? undefined : 'development-only-gateway-key',
    ),
    trustProxy: env.TRUST_PROXY === 'true',
    rateLimit: {
      windowMs: 60_000,
      globalMax: numberEnv(env.RATE_LIMIT_GLOBAL_MAX, 100),
      mutatingMax: numberEnv(env.RATE_LIMIT_MUTATING_MAX, 20),
    },
    auditLogPath: env.AUDIT_LOG_PATH ?? 'logs/audit.log',
  }
}
