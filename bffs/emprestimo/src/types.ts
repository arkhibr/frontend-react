import type { InternalUser } from './auth.ts'

export type BffEnv = {
  Variables: {
    auth: InternalUser
  }
}
