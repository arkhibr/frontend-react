import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/shared/lib/store'
import { ROUTES } from '../routes'

export function GuestGuard() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
