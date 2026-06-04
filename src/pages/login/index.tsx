import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login } from '@/shared/lib/store/authSlice'
import { TEST_TOKEN } from '@/shared/auth/testToken'
import { Button } from '@/shared/ui/Button/Button'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  return (
    <main className="flex h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold text-primary">Entrar</h1>
        <Button onClick={() => { dispatch(login({ token: TEST_TOKEN })); navigate('/dashboard') }}>
          Entrar
        </Button>
      </div>
    </main>
  )
}
