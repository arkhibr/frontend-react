import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/shared/lib/store'
import { logout } from '@/shared/lib/store/authSlice'
import { getApiUrl } from '@/shared/config'
import { MfeErrorBoundary } from './MfeErrorBoundary'
import { loadMfeModule } from './loadMfeModule'
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

    loadMfeModule(entry.url)
      .then((m) => {
        if (cancelled) return
        mod = m
        m.mount(el, {
          apiUrl: getApiUrl(),
          token,
          basePath: entry.route,
          onUnauthorized: () => dispatch(logout()),
        })
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
  }, [entry.url, entry.route, entry.name, token, dispatch])

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
