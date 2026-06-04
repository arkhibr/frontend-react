import { useForm } from 'react-hook-form'

export interface Endereco {
  cep: string
  logradouro: string
  numero: string
}

export function EnderecoForm({ initial, onSubmit }: { initial: Endereco; onSubmit: (e: Endereco) => void }) {
  const { register, handleSubmit } = useForm<Endereco>({ defaultValues: initial })
  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">CEP<input {...register('cep')} className="rounded border p-2" /></label>
      <label className="flex flex-col gap-1">Logradouro<input {...register('logradouro')} className="rounded border p-2" /></label>
      <label className="flex flex-col gap-1">Número<input {...register('numero')} className="rounded border p-2" /></label>
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Salvar</button>
    </form>
  )
}
