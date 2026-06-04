import { useEffect, useState } from 'react'
import { createHttpClient } from './api/httpClient'
import { EnderecoForm, type Endereco } from './EnderecoForm'
import type { MfeMountContext } from './contract'

export function EnderecoApp({ ctx }: { ctx: MfeMountContext }) {
  const [endereco, setEndereco] = useState<Endereco | null>(null)
  const [saved, setSaved] = useState(false)
  const client = createHttpClient(ctx)

  useEffect(() => {
    client<Endereco>('/usuario/endereco').then(setEndereco).catch(() => setEndereco({ cep: '', logradouro: '', numero: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!endereco) return <p>Carregando endereço…</p>

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">Alteração de Endereço</h2>
      <EnderecoForm
        initial={endereco}
        onSubmit={async (e) => {
          await client('/usuario/endereco', { method: 'PUT', body: JSON.stringify(e) })
          setSaved(true)
        }}
      />
      {saved && <p role="status" className="mt-4 text-green-700">Endereço atualizado.</p>}
    </section>
  )
}
