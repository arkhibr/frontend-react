export const ROUTES = {
  LOGIN:     '/login',
  DASHBOARD: '/dashboard',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
