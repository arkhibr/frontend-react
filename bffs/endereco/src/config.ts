export interface BffConfig {
  port: number
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  return {
    port: Number(env.PORT ?? 4002),
  }
}
