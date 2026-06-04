import { useEffect, useState } from 'react'
import { createHttpClient } from './api/httpClient'
import { EmprestimoForm, type Emprestimo } from './EmprestimoForm'
import type { MfeMountContext } from './contract'

export function EmprestimoApp({ ctx }: { ctx: MfeMountContext }) {
  const [emprestimo, setEmprestimo] = useState<Emprestimo | null>(null)
  const [saved, setSaved] = useState(false)
  const client = createHttpClient(ctx)

  useEffect(() => {
    client<Emprestimo>('/usuario/emprestimo').then(setEmprestimo).catch(() => setEmprestimo({ valor: '', parcelas: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!emprestimo) return <p>Carregando simulação…</p>

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">Simulação de Empréstimo</h2>
      <EmprestimoForm
        initial={emprestimo}
        onSubmit={async (e) => {
          await client('/usuario/emprestimo', { method: 'PUT', body: JSON.stringify(e) })
          setSaved(true)
        }}
      />
      {saved && <p role="status" className="mt-4 text-green-700">Simulação registrada.</p>}
    </section>
  )
}
