import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { createAppRouter } from '@/app/router'
import { loadConfig } from '@/shared/config'
import { loadManifest } from '@/app/mfe/loadManifest'
import { resolveLoadOrder } from '@/app/mfe/dependencyResolver'
import '@/app/styles/globals.css'

async function prepare() {
  await loadConfig()
  if (import.meta.env.DEV) {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
}

prepare()
  .then(async () => {
    const manifest = await loadManifest()
    const ordered = resolveLoadOrder(manifest.mfes)
    const router = createAppRouter(ordered)
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Providers>
          <RouterProvider router={router} />
        </Providers>
      </StrictMode>,
    )
  })
  .catch((err) => {
    document.getElementById('root')!.innerHTML =
      `<pre style="padding:2rem;color:#b91c1c;font-family:monospace">Falha ao iniciar o portal:\n${String(err)}</pre>`
  })
