import { useEffect, useState } from 'react'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    let vivo = true
    setLoading(true)
    setError(null)
    fn()
      .then((d) => { if (vivo) setData(d) })
      .catch((e) => { if (vivo) setError(e instanceof Error ? e : new Error(String(e))) })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading, error }
}
