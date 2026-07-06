export interface BffConfig {
  port: number
}

function numberEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  return raw !== undefined && Number.isFinite(parsed) ? parsed : fallback
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  return {
    port: numberEnv(env.PORT, 4002),
  }
}
