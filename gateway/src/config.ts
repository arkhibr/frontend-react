export interface GatewayConfig {
  port: number
  corsOrigin: string
  bffs: Record<string, string>
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  return {
    port: numberEnv(env.PORT, 4000),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
    bffs: {
      emprestimo: env.BFF_EMPRESTIMO_URL ?? 'http://localhost:4001',
      endereco: env.BFF_ENDERECO_URL ?? 'http://localhost:4002',
    },
    rateLimit: {
      windowMs: 60_000,
      globalMax: numberEnv(env.RATE_LIMIT_GLOBAL_MAX, 100),
      mutatingMax: numberEnv(env.RATE_LIMIT_MUTATING_MAX, 20),
    },
    auditLogPath: env.AUDIT_LOG_PATH ?? 'logs/audit.log',
  }
}
