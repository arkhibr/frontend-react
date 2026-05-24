import { store } from '@/shared/lib/store'
import { logout } from '@/shared/lib/store/authSlice'
import { isTokenExpired } from './tokenParser'
import { tokenStorage } from './tokenStorage'

let intervalId: ReturnType<typeof setInterval> | null = null

function handleUnauthorized() {
  store.dispatch(logout())
}

export const sessionMonitor = {
  start(): void {
    if (intervalId) return

    intervalId = setInterval(() => {
      const token = tokenStorage.get()
      if (token && isTokenExpired(token)) {
        store.dispatch(logout())
      }
    }, 60_000)

    window.addEventListener('auth:unauthorized', handleUnauthorized)
  },

  stop(): void {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    window.removeEventListener('auth:unauthorized', handleUnauthorized)
  },
}
