import type { AuthenticatedUser } from './auth.ts'

export type GatewayEnv = {
  Variables: {
    correlationId: string
    auth: AuthenticatedUser
  }
}
