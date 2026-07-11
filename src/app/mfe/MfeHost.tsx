import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/shared/lib/store'
import { logout } from '@/shared/lib/store/authSlice'
import { getApiUrl } from '@/shared/config'
import { MfeErrorBoundary } from './MfeErrorBoundary'
import { loadMfeModule } from './loadMfeModule'
import { markStart, markEnd } from './perf'
import type { MfeEntry, MfeModule } from './types'

function MfeMountPoint({ entry }: { entry: MfeEntry }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const token = useSelector((s: RootState) => s.auth.token)
  const dispatch = useDispatch()
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    let mod: MfeModule | null = null
    let cancelled = false

    const loadStart = performance?.now?.() ?? 0
    loadMfeModule(entry.url, entry.integrity, entry.id)
      .then((m) => {
        if (cancelled) return
        mod = m
        markStart(entry.id, 'mount')
        m.mount(el, {
          apiUrl: getApiUrl(),
          token,
          basePath: entry.route,
          onUnauthorized: () => dispatch(logout()),
        })
        markEnd(entry.id, 'mount')
        try {
          if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
            performance.mark(`mfe:${entry.id}:total:start`, { startTime: loadStart })
            performance.measure(`mfe:${entry.id}:total`, `mfe:${entry.id}:total:start`)
          }
        } catch {
          // ignore: performance API unavailable ou mark não suportado
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error(`[mfe] falha ao carregar "${entry.name}":`, err)
        setLoadError(err instanceof Error ? err : new Error(String(err)))
      })

    return () => {
      cancelled = true
      if (mod && el) mod.unmount(el)
    }
  }, [entry.url, entry.integrity, entry.route, entry.name, entry.id, token, dispatch])

  if (loadError) throw loadError

  return <div ref={hostRef} data-mfe={entry.id} />
}

export function MfeHost({ entry }: { entry: MfeEntry }) {
  if (entry.state === 'maintenance') {
    return (
      <div role="status" className="rounded border border-secondary/30 bg-surface p-6 text-secondary">
        O módulo <strong>{entry.name}</strong> está em manutenção.
      </div>
    )
  }

  if (entry.state === 'disabled') return null

  return (
    <MfeErrorBoundary mfeName={entry.name}>
      <MfeMountPoint entry={entry} />
    </MfeErrorBoundary>
  )
}
