import { Router } from 'express'
import type { Response } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

export function createProxyRouter(bffs: Record<string, string>, internalGatewayKey: string): Router {
  const router = Router()

  for (const [name, target] of Object.entries(bffs)) {
    router.use(
      `/bff/${name}`,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        on: {
          proxyReq: (proxyReq, _req, res) => {
            const correlationId = (res as unknown as Response).locals.correlationId as string
            const auth = (res as unknown as Response).locals.auth as { sub: string; roles: string[] }
            proxyReq.removeHeader('authorization')
            proxyReq.setHeader('X-Correlation-Id', correlationId)
            proxyReq.setHeader('X-Internal-Gateway-Key', internalGatewayKey)
            proxyReq.setHeader('X-Authenticated-Subject', auth.sub)
            proxyReq.setHeader('X-Authenticated-Roles', auth.roles.join(','))
          },
        },
      }),
    )
  }

  router.use((_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'Rota não encontrada.',
      correlationId: (res.locals.correlationId as string | undefined) ?? 'unknown',
    })
  })

  return router
}
