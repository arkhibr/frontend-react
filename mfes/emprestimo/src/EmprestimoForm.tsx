import { useForm } from 'react-hook-form'

export interface Emprestimo {
  valor: string
  parcelas: string
}

export function EmprestimoForm({ initial, onSubmit }: { initial: Emprestimo; onSubmit: (e: Emprestimo) => void }) {
  const { register, handleSubmit } = useForm<Emprestimo>({ defaultValues: initial })
  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">Valor<input {...register('valor')} className="rounded border p-2" /></label>
      <label className="flex flex-col gap-1">Parcelas<input {...register('parcelas')} className="rounded border p-2" /></label>
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Simular</button>
    </form>
  )
}
