import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/shared/lib/store'
import { ROUTES } from '../routes'

export function AuthGuard() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ returnUrl: location.pathname }}
        replace
      />
    )
  }

  return <Outlet />
}
