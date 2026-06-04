import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from './routes'
import { AuthGuard } from './guards/AuthGuard'
import { GuestGuard } from './guards/GuestGuard'
import { ShellLayout } from '@/app/layout/ShellLayout'
import { MfeHost } from '@/app/mfe/MfeHost'
import type { MfeEntry } from '@/app/mfe/types'

const DashboardPage = lazy(() => import('@/pages/dashboard'))
const LoginPage = lazy(() => import('@/pages/login'))

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export function createAppRouter(mfes: MfeEntry[]) {
  const mfeRoutes = mfes
    .filter((m) => m.state !== 'disabled')
    .map((m) => ({ path: m.route, element: <MfeHost entry={m} /> }))

  return createBrowserRouter([
    {
      element: <AuthGuard />,
      children: [
        {
          element: <ShellLayout mfes={mfes} />,
          children: [
            {
              path: ROUTES.DASHBOARD,
              element: (
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              ),
            },
            ...mfeRoutes,
          ],
        },
      ],
    },
    {
      element: <GuestGuard />,
      children: [
        {
          path: ROUTES.LOGIN,
          element: (
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          ),
        },
      ],
    },
    { path: '/', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
    {
      path: '*',
      element: (
        <main className="flex h-screen items-center justify-center">
          <p className="text-secondary">Página não encontrada.</p>
        </main>
      ),
    },
  ])
}
