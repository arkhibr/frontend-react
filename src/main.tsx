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
    // MSW é ferramenta de dev: se o Service Worker não registrar (arquivo
    // ausente, SW bloqueado), apenas avisa — não derruba o boot do shell.
    try {
      const { worker } = await import('@/mocks/browser')
      await worker.start({ onUnhandledRequest: 'bypass' })
    } catch (err) {
      console.warn('[msw] worker não registrado; seguindo sem mocks:', err)
    }
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
    // Constrói o fallback de erro via API do DOM (sem innerHTML): evita o sink
    // guardado por Trusted Types — quando o policy virar enforcement, innerHTML
    // lançaria exceção justamente ao tentar exibir o erro de boot. Ver SECURITY.md.
    const pre = document.createElement('pre')
    pre.style.padding = '2rem'
    pre.style.color = '#b91c1c'
    pre.style.fontFamily = 'monospace'
    pre.textContent = `Falha ao iniciar o portal:\n${String(err)}`
    document.getElementById('root')!.replaceChildren(pre)
  })
