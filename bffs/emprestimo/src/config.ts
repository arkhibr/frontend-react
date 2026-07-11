export interface BffConfig {
  port: number
  internalGatewayKey: string
}

function numberEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  return raw !== undefined && Number.isFinite(parsed) ? parsed : fallback
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  const internalGatewayKey = env.INTERNAL_GATEWAY_KEY
  if (env.NODE_ENV === 'production' && !internalGatewayKey) {
    throw new Error('INTERNAL_GATEWAY_KEY é obrigatório em produção')
  }
  return {
    port: numberEnv(env.PORT, 4001),
    internalGatewayKey: internalGatewayKey ?? 'development-only-gateway-key',
  }
}
