import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login } from '@/shared/lib/store/authSlice'
import { loginRequest } from '@/features/auth/loginRequest'
import { Button } from '@/shared/ui/Button/Button'

type LoginForm = { email: string; senha: string }

export default function LoginPage() {
  const { register, handleSubmit } = useForm<LoginForm>({ defaultValues: { email: '', senha: '' } })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit({ email, senha }: LoginForm) {
    setError(null)
    setSubmitting(true)
    try {
      const token = await loginRequest(email, senha)
      dispatch(login({ token }))
      navigate('/dashboard')
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex h-screen items-center justify-center bg-surface">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-8 shadow"
      >
        <h1 className="text-2xl font-bold text-primary">Entrar</h1>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <label className="flex flex-col gap-1 text-sm text-secondary">
          E-mail
          <input {...register('email')} type="email" autoComplete="username" className="rounded border p-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-secondary">
          Senha
          <input {...register('senha')} type="password" autoComplete="current-password" className="rounded border p-2" />
        </label>
        <Button type="submit" loading={submitting}>Entrar</Button>
      </form>
    </main>
  )
}
