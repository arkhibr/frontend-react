import { NavLink, Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logout } from '@/shared/lib/store/authSlice'
import { Button } from '@/shared/ui/Button/Button'
import type { MfeEntry } from '@/app/mfe/types'

export function ShellLayout({ mfes }: { mfes: MfeEntry[] }) {
  const dispatch = useDispatch()
  const visible = mfes.filter((m) => m.state !== 'disabled')

  return (
    <div className="flex h-screen">
      <aside className="w-64 shrink-0 border-r border-secondary/20 bg-surface p-4">
        <h1 className="mb-6 text-lg font-bold text-primary">Portal</h1>
        <nav className="flex flex-col gap-1">
          <NavLink to="/dashboard" className="rounded px-3 py-2 text-secondary hover:bg-primary/10">
            Início
          </NavLink>
          {visible.map((m) => (
            <NavLink
              key={m.id}
              to={m.route}
              className="rounded px-3 py-2 text-secondary hover:bg-primary/10"
            >
              {m.name}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="mt-6" onClick={() => dispatch(logout())}>
          Sair
        </Button>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
