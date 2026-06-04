# Plataforma de Microfrontends Dinâmicos (Sub-projeto A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o repo `frontend-react` no shell nuclear de uma plataforma de microfrontends, com runtime que carrega MFEs autônomos de buckets S3 (LocalStack) em runtime, validando manifesto e ordem de dependências, e entregar o primeiro MFE (`mfe-endereco`) ponta-a-ponta.

**Architecture:** O shell carrega `mfe-manifest.json`, valida o schema (fail-fast), resolve a ordem de carga por ordenação topológica, e renderiza rotas dinâmicas onde um `<MfeHost>` faz `import()` ESM do bundle no S3 e chama o contrato `mount(div, ctx)` / `unmount(div)`. Cada MFE empacota seu próprio React e só fala com o back-end (via `apiUrl`); um error boundary isola falhas. O MFE é buildado em Vite lib mode e deployado num bucket LocalStack via AWS SDK v3.

**Tech Stack:** React 19, TypeScript, Vite 8 (lib mode), react-router-dom 7, Redux Toolkit, React Query, MSW, Vitest 4, Playwright, Docker + LocalStack, AWS SDK for JavaScript v3.

**Spec:** `docs/superpowers/specs/2026-06-04-microfrontends-dinamicos-plataforma-design.md`

**Layout de diretórios (pastas-irmãs locais):**
```
/Volumes/Marco-Dev/dev/
├── frontend-react/      ← shell nuclear (este repo)
├── mfe-endereco/        ← novo repo do MFE de endereço
└── arkhi-mfe-infra/     ← docker-compose (LocalStack) + orquestração
```

---

## Fase 1 — Runtime do shell (em `frontend-react/`)

Todos os módulos novos ficam em `src/app/mfe/` (camada `app` do FSD; já casa com o boundary `app` no `eslint.config.ts` — sem mudança de lint necessária).

### Task 1: Tipos do manifesto

**Files:**
- Create: `src/app/mfe/types.ts`

- [ ] **Step 1: Criar os tipos**

```ts
// src/app/mfe/types.ts
export type MfeState = 'active' | 'disabled' | 'maintenance'

export interface MfeEntry {
  id: string
  name: string
  state: MfeState
  url: string
  route: string
  dependsOn: string[]
}

export interface MfeManifest {
  schemaVersion: number
  mfes: MfeEntry[]
}

/** Contrato que todo bundle de MFE deve exportar. */
export interface MfeMountContext {
  apiUrl: string
  token: string | null
  onUnauthorized: () => void
  basePath: string
}

export interface MfeModule {
  mount: (el: HTMLElement, ctx: MfeMountContext) => void
  unmount: (el: HTMLElement) => void
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS (sem erros)

- [ ] **Step 3: Commit**

```bash
git add src/app/mfe/types.ts
git commit -m "feat(mfe): tipos do manifesto e do contrato de montagem"
```

---

### Task 2: Validador do manifesto (fail-fast)

Valida estrutura, enum de `state`, e referências de `dependsOn`. **Não** detecta ciclo (isso é da Task 3).

**Files:**
- Create: `src/app/mfe/manifest.ts`
- Test: `src/app/mfe/__tests__/manifest.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/app/mfe/__tests__/manifest.test.ts
import { describe, it, expect } from 'vitest'
import { validateManifest } from '../manifest'

const valid = {
  schemaVersion: 1,
  mfes: [
    { id: 'a', name: 'A', state: 'active', url: 'http://x/a.js', route: '/a', dependsOn: [] },
    { id: 'b', name: 'B', state: 'maintenance', url: 'http://x/b.js', route: '/b', dependsOn: ['a'] },
  ],
}

describe('validateManifest', () => {
  it('aceita um manifesto válido e o retorna tipado', () => {
    expect(validateManifest(valid).mfes).toHaveLength(2)
  })

  it('rejeita schemaVersion desconhecida', () => {
    expect(() => validateManifest({ ...valid, schemaVersion: 99 })).toThrow(/schemaVersion/)
  })

  it('rejeita quando mfes não é array', () => {
    expect(() => validateManifest({ schemaVersion: 1, mfes: {} })).toThrow(/mfes/)
  })

  it('rejeita state inválido', () => {
    const bad = { schemaVersion: 1, mfes: [{ ...valid.mfes[0], state: 'ligado' }] }
    expect(() => validateManifest(bad)).toThrow(/state/)
  })

  it('rejeita campo obrigatório ausente', () => {
    const bad = { schemaVersion: 1, mfes: [{ id: 'a', name: 'A', state: 'active', route: '/a', dependsOn: [] }] }
    expect(() => validateManifest(bad)).toThrow(/url/)
  })

  it('rejeita dependsOn apontando para id inexistente', () => {
    const bad = { schemaVersion: 1, mfes: [{ ...valid.mfes[0], dependsOn: ['fantasma'] }] }
    expect(() => validateManifest(bad)).toThrow(/fantasma/)
  })

  it('rejeita id duplicado', () => {
    const bad = { schemaVersion: 1, mfes: [valid.mfes[0], valid.mfes[0]] }
    expect(() => validateManifest(bad)).toThrow(/duplicad/i)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/mfe/__tests__/manifest.test.ts`
Expected: FAIL ("validateManifest is not a function" / módulo inexistente)

- [ ] **Step 3: Implementar**

```ts
// src/app/mfe/manifest.ts
import type { MfeManifest, MfeEntry, MfeState } from './types'

const SUPPORTED_SCHEMA = 1
const STATES: MfeState[] = ['active', 'disabled', 'maintenance']

function fail(msg: string): never {
  throw new Error(`[mfe-manifest] ${msg}`)
}

function validateEntry(raw: unknown, index: number): MfeEntry {
  if (typeof raw !== 'object' || raw === null) fail(`mfes[${index}] não é um objeto`)
  const e = raw as Record<string, unknown>
  for (const field of ['id', 'name', 'url', 'route'] as const) {
    if (typeof e[field] !== 'string' || e[field] === '') fail(`mfes[${index}].${field} ausente ou vazio`)
  }
  if (!STATES.includes(e.state as MfeState)) fail(`mfes[${index}].state inválido: ${String(e.state)}`)
  if (!Array.isArray(e.dependsOn) || e.dependsOn.some((d) => typeof d !== 'string')) {
    fail(`mfes[${index}].dependsOn deve ser um array de strings`)
  }
  return {
    id: e.id as string,
    name: e.name as string,
    state: e.state as MfeState,
    url: e.url as string,
    route: e.route as string,
    dependsOn: e.dependsOn as string[],
  }
}

export function validateManifest(raw: unknown): MfeManifest {
  if (typeof raw !== 'object' || raw === null) fail('manifesto não é um objeto')
  const m = raw as Record<string, unknown>
  if (m.schemaVersion !== SUPPORTED_SCHEMA) fail(`schemaVersion não suportada: ${String(m.schemaVersion)} (esperado ${SUPPORTED_SCHEMA})`)
  if (!Array.isArray(m.mfes)) fail('mfes deve ser um array')

  const mfes = m.mfes.map(validateEntry)

  const ids = new Set<string>()
  for (const e of mfes) {
    if (ids.has(e.id)) fail(`id duplicado: ${e.id}`)
    ids.add(e.id)
  }
  for (const e of mfes) {
    for (const dep of e.dependsOn) {
      if (!ids.has(dep)) fail(`mfes[${e.id}].dependsOn referencia id inexistente: ${dep}`)
    }
  }

  return { schemaVersion: SUPPORTED_SCHEMA, mfes }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/mfe/__tests__/manifest.test.ts`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/mfe/manifest.ts src/app/mfe/__tests__/manifest.test.ts
git commit -m "feat(mfe): validador fail-fast do manifesto"
```

---

### Task 3: Resolvedor de dependências (ordenação topológica + ciclo)

**Files:**
- Create: `src/app/mfe/dependencyResolver.ts`
- Test: `src/app/mfe/__tests__/dependencyResolver.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/app/mfe/__tests__/dependencyResolver.test.ts
import { describe, it, expect } from 'vitest'
import { resolveLoadOrder } from '../dependencyResolver'
import type { MfeEntry } from '../types'

const mk = (id: string, dependsOn: string[] = []): MfeEntry => ({
  id, name: id, state: 'active', url: `http://x/${id}.js`, route: `/${id}`, dependsOn,
})

describe('resolveLoadOrder', () => {
  it('ordena dependências antes dos dependentes', () => {
    const order = resolveLoadOrder([mk('b', ['a']), mk('a')]).map((m) => m.id)
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
  })

  it('mantém todos os MFEs no resultado', () => {
    expect(resolveLoadOrder([mk('a'), mk('b'), mk('c')])).toHaveLength(3)
  })

  it('detecta ciclo e lança erro', () => {
    expect(() => resolveLoadOrder([mk('a', ['b']), mk('b', ['a'])])).toThrow(/ciclo/i)
  })

  it('resolve cadeia transitiva c→b→a', () => {
    const order = resolveLoadOrder([mk('c', ['b']), mk('b', ['a']), mk('a')]).map((m) => m.id)
    expect(order).toEqual(['a', 'b', 'c'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/mfe/__tests__/dependencyResolver.test.ts`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar (Kahn)**

```ts
// src/app/mfe/dependencyResolver.ts
import type { MfeEntry } from './types'

/**
 * Ordenação topológica (algoritmo de Kahn): retorna os MFEs em ordem tal que
 * cada um aparece depois de todos os seus dependsOn. Lança erro em caso de ciclo.
 */
export function resolveLoadOrder(mfes: MfeEntry[]): MfeEntry[] {
  const byId = new Map(mfes.map((m) => [m.id, m]))
  const indegree = new Map(mfes.map((m) => [m.id, m.dependsOn.length]))
  const dependents = new Map<string, string[]>()

  for (const m of mfes) {
    for (const dep of m.dependsOn) {
      dependents.set(dep, [...(dependents.get(dep) ?? []), m.id])
    }
  }

  const queue = mfes.filter((m) => indegree.get(m.id) === 0).map((m) => m.id)
  const ordered: MfeEntry[] = []

  while (queue.length > 0) {
    const id = queue.shift() as string
    ordered.push(byId.get(id) as MfeEntry)
    for (const dependent of dependents.get(id) ?? []) {
      const next = (indegree.get(dependent) as number) - 1
      indegree.set(dependent, next)
      if (next === 0) queue.push(dependent)
    }
  }

  if (ordered.length !== mfes.length) {
    const remaining = mfes.filter((m) => !ordered.includes(m)).map((m) => m.id)
    throw new Error(`[mfe-manifest] ciclo de dependência detectado entre: ${remaining.join(', ')}`)
  }

  return ordered
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/mfe/__tests__/dependencyResolver.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/mfe/dependencyResolver.ts src/app/mfe/__tests__/dependencyResolver.test.ts
git commit -m "feat(mfe): resolvedor topologico de ordem de carga com deteccao de ciclo"
```

---

### Task 4: Carregador de módulo ESM (mockável)

Isolado num módulo próprio para que `MfeHost` seja testável (os testes fazem `vi.mock` aqui).

**Files:**
- Create: `src/app/mfe/loadMfeModule.ts`
- Test: `src/app/mfe/__tests__/loadMfeModule.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/app/mfe/__tests__/loadMfeModule.test.ts
import { describe, it, expect } from 'vitest'
import { assertMfeModule } from '../loadMfeModule'

describe('assertMfeModule', () => {
  it('aceita módulo com mount e unmount', () => {
    const m = { mount: () => {}, unmount: () => {} }
    expect(assertMfeModule(m, 'http://x/a.js')).toBe(m)
  })

  it('rejeita módulo sem mount', () => {
    expect(() => assertMfeModule({ unmount: () => {} }, 'http://x/a.js')).toThrow(/mount/)
  })

  it('rejeita módulo sem unmount', () => {
    expect(() => assertMfeModule({ mount: () => {} }, 'http://x/a.js')).toThrow(/unmount/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/mfe/__tests__/loadMfeModule.test.ts`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```ts
// src/app/mfe/loadMfeModule.ts
import type { MfeModule } from './types'

export function assertMfeModule(mod: unknown, url: string): MfeModule {
  const m = mod as Partial<MfeModule>
  if (typeof m?.mount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta mount()`)
  if (typeof m?.unmount !== 'function') throw new Error(`[mfe] bundle ${url} não exporta unmount()`)
  return m as MfeModule
}

export async function loadMfeModule(url: string): Promise<MfeModule> {
  const mod = await import(/* @vite-ignore */ url)
  return assertMfeModule(mod, url)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/mfe/__tests__/loadMfeModule.test.ts`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/mfe/loadMfeModule.ts src/app/mfe/__tests__/loadMfeModule.test.ts
git commit -m "feat(mfe): carregador ESM com validacao do contrato"
```

---

### Task 5: Error boundary do MFE

**Files:**
- Create: `src/app/mfe/MfeErrorBoundary.tsx`
- Test: `src/app/mfe/__tests__/MfeErrorBoundary.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/app/mfe/__tests__/MfeErrorBoundary.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MfeErrorBoundary } from '../MfeErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('MfeErrorBoundary', () => {
  it('renderiza os filhos quando não há erro', () => {
    render(<MfeErrorBoundary mfeName="A"><span>ok</span></MfeErrorBoundary>)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('mostra aviso isolado quando um filho lança erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<MfeErrorBoundary mfeName="Endereço"><Bomb /></MfeErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent(/Endereço/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/mfe/__tests__/MfeErrorBoundary.test.tsx`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```tsx
// src/app/mfe/MfeErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

type Props = { mfeName: string; children: ReactNode }
type State = { hasError: boolean }

export class MfeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[mfe] falha no microfrontend "${this.props.mfeName}":`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="rounded border border-danger/40 bg-danger/5 p-6 text-danger">
          O módulo <strong>{this.props.mfeName}</strong> está indisponível no momento.
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/mfe/__tests__/MfeErrorBoundary.test.tsx`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/mfe/MfeErrorBoundary.tsx src/app/mfe/__tests__/MfeErrorBoundary.test.tsx
git commit -m "feat(mfe): error boundary para isolar falhas de microfrontend"
```

---

### Task 6: `MfeHost` — monta/desmonta o MFE numa `<div>`

Lê `token` do Redux, `apiUrl` do config, e despacha `logout` em `onUnauthorized`. Trata `maintenance` (aviso) e `disabled` (não renderiza nada). Usa `loadMfeModule` (mockado nos testes).

**Files:**
- Create: `src/app/mfe/MfeHost.tsx`
- Test: `src/app/mfe/__tests__/MfeHost.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/app/mfe/__tests__/MfeHost.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from '@/shared/lib/store/authSlice'
import { MfeHost } from '../MfeHost'
import type { MfeEntry } from '../types'

const mount = vi.fn()
const unmount = vi.fn()

vi.mock('../loadMfeModule', () => ({
  loadMfeModule: vi.fn(async () => ({ mount, unmount })),
}))

const entry: MfeEntry = {
  id: 'endereco', name: 'Endereço', state: 'active',
  url: 'http://x/endereco.js', route: '/endereco', dependsOn: [],
}

function renderHost(e: MfeEntry) {
  const store = configureStore({ reducer: { auth: authSlice.reducer } })
  return render(<Provider store={store}><MfeHost entry={e} /></Provider>)
}

beforeEach(() => {
  mount.mockClear()
  unmount.mockClear()
})

describe('MfeHost', () => {
  it('chama mount com a div e o contexto quando active', async () => {
    renderHost(entry)
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(1))
    const [el, ctx] = mount.mock.calls[0]
    expect(el).toBeInstanceOf(HTMLElement)
    expect(ctx).toMatchObject({ basePath: '/endereco' })
    expect(typeof ctx.onUnauthorized).toBe('function')
  })

  it('chama unmount ao desmontar o componente', async () => {
    const { unmount: unmountReact } = renderHost(entry)
    await waitFor(() => expect(mount).toHaveBeenCalled())
    unmountReact()
    expect(unmount).toHaveBeenCalledTimes(1)
  })

  it('mostra aviso e não monta quando maintenance', async () => {
    renderHost({ ...entry, state: 'maintenance' })
    expect(screen.getByRole('status')).toHaveTextContent(/manuten/i)
    expect(mount).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/mfe/__tests__/MfeHost.test.tsx`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```tsx
// src/app/mfe/MfeHost.tsx
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/shared/lib/store'
import { logout } from '@/shared/lib/store/authSlice'
import { getApiUrl } from '@/shared/config'
import { MfeErrorBoundary } from './MfeErrorBoundary'
import { loadMfeModule } from './loadMfeModule'
import type { MfeEntry, MfeModule } from './types'

export function MfeHost({ entry }: { entry: MfeEntry }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const token = useSelector((s: RootState) => s.auth.token)
  const dispatch = useDispatch()

  useEffect(() => {
    if (entry.state !== 'active') return
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
        // Propaga para o error boundary mais próximo via re-throw assíncrono controlado
        console.error(`[mfe] falha ao carregar "${entry.name}":`, err)
        throw err
      })

    return () => {
      cancelled = true
      if (mod && el) mod.unmount(el)
    }
    // Recarrega o MFE se a URL ou o token mudarem (snapshot de sessão).
  }, [entry.url, entry.route, entry.state, entry.name, token, dispatch])

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
      <div ref={hostRef} data-mfe={entry.id} />
    </MfeErrorBoundary>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/mfe/__tests__/MfeHost.test.tsx`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/mfe/MfeHost.tsx src/app/mfe/__tests__/MfeHost.test.tsx
git commit -m "feat(mfe): MfeHost monta/desmonta microfrontend na div com contexto"
```

---

### Task 7: Carregador do manifesto

**Files:**
- Create: `src/app/mfe/loadManifest.ts`
- Test: `src/app/mfe/__tests__/loadManifest.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/app/mfe/__tests__/loadManifest.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadManifest } from '../loadManifest'

const ok = {
  schemaVersion: 1,
  mfes: [{ id: 'a', name: 'A', state: 'active', url: 'http://x/a.js', route: '/a', dependsOn: [] }],
}

afterEach(() => vi.restoreAllMocks())

describe('loadManifest', () => {
  it('carrega e valida o manifesto', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(ok))))
    const m = await loadManifest()
    expect(m.mfes[0].id).toBe('a')
  })

  it('lança erro se o fetch falhar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })))
    await expect(loadManifest()).rejects.toThrow(/manifesto/i)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/mfe/__tests__/loadManifest.test.ts`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```ts
// src/app/mfe/loadManifest.ts
import { validateManifest } from './manifest'
import type { MfeManifest } from './types'

export async function loadManifest(): Promise<MfeManifest> {
  const res = await fetch('/mfe-manifest.json')
  if (!res.ok) throw new Error(`[mfe-manifest] falha ao carregar manifesto: HTTP ${res.status}`)
  const data = await res.json()
  return validateManifest(data)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/mfe/__tests__/loadManifest.test.ts`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/mfe/loadManifest.ts src/app/mfe/__tests__/loadManifest.test.ts
git commit -m "feat(mfe): carregador do manifesto via fetch"
```

---

### Task 8: Layout do shell com navegação dinâmica

A home injeta os MFEs: o menu é montado a partir da lista de MFEs visíveis (`active` + `maintenance`). `disabled` não aparece.

**Files:**
- Create: `src/app/layout/ShellLayout.tsx`
- Test: `src/app/layout/__tests__/ShellLayout.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// src/app/layout/__tests__/ShellLayout.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from '@/shared/lib/store/authSlice'
import { ShellLayout } from '../ShellLayout'
import type { MfeEntry } from '@/app/mfe/types'

const mk = (id: string, state: MfeEntry['state']): MfeEntry => ({
  id, name: id.toUpperCase(), state, url: `http://x/${id}.js`, route: `/${id}`, dependsOn: [],
})

function renderLayout(mfes: MfeEntry[]) {
  const store = configureStore({ reducer: { auth: authSlice.reducer } })
  return render(
    <Provider store={store}>
      <MemoryRouter><ShellLayout mfes={mfes} /></MemoryRouter>
    </Provider>,
  )
}

describe('ShellLayout', () => {
  it('mostra no menu os MFEs active e maintenance', () => {
    renderLayout([mk('endereco', 'active'), mk('emprestimo', 'maintenance')])
    expect(screen.getByRole('link', { name: /ENDERECO/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /EMPRESTIMO/ })).toBeInTheDocument()
  })

  it('não mostra MFEs disabled', () => {
    renderLayout([mk('endereco', 'active'), mk('oculto', 'disabled')])
    expect(screen.queryByRole('link', { name: /OCULTO/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/layout/__tests__/ShellLayout.test.tsx`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```tsx
// src/app/layout/ShellLayout.tsx
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/layout/__tests__/ShellLayout.test.tsx`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/layout/ShellLayout.tsx src/app/layout/__tests__/ShellLayout.test.tsx
git commit -m "feat(shell): layout com navegacao dinamica a partir do manifesto"
```

---

### Task 9: Router dinâmico a partir do manifesto

Refatora `app/router/index.tsx` para exportar `createAppRouter(mfes)` em vez de um `router` estático. Mantém login (GuestGuard) e protege as rotas de MFE com `AuthGuard` + `ShellLayout`.

**Files:**
- Modify: `src/app/router/index.tsx` (substitui o `export const router` por `createAppRouter`)
- Modify: `src/main.tsx` (passa a usar `createAppRouter` após carregar o manifesto)

- [ ] **Step 1: Reescrever o router**

```tsx
// src/app/router/index.tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from './routes'
import { AuthGuard } from './guards/AuthGuard'
import { GuestGuard } from './guards/GuestGuard'
import { ShellLayout } from '@/app/layout/ShellLayout'
import { MfeHost } from '@/app/mfe/MfeHost'
import type { MfeEntry } from '@/app/mfe/types'

const DashboardPage = lazy(() => import('@/pages/dashboard'))
const LoginPage = lazy(() => import('@/pages/login'))

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export function createAppRouter(mfes: MfeEntry[]) {
  const mfeRoutes = mfes
    .filter((m) => m.state !== 'disabled')
    .map((m) => ({ path: m.route, element: <MfeHost entry={m} /> }))

  return createBrowserRouter([
    {
      element: <AuthGuard />,
      children: [
        {
          element: <ShellLayout mfes={mfes} />,
          children: [
            {
              path: ROUTES.DASHBOARD,
              element: (
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              ),
            },
            ...mfeRoutes,
          ],
        },
      ],
    },
    {
      element: <GuestGuard />,
      children: [
        {
          path: ROUTES.LOGIN,
          element: (
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          ),
        },
      ],
    },
    { path: '/', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
    {
      path: '*',
      element: (
        <main className="flex h-screen items-center justify-center">
          <p className="text-secondary">Página não encontrada.</p>
        </main>
      ),
    },
  ])
}
```

- [ ] **Step 2: Atualizar o boot em `main.tsx`**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/app/providers'
import { createAppRouter } from '@/app/router'
import { loadConfig } from '@/shared/config'
import { loadManifest } from '@/app/mfe/loadManifest'
import { resolveLoadOrder } from '@/app/mfe/dependencyResolver'
import '@/app/styles/globals.css'

async function prepare() {
  await loadConfig()
  if (import.meta.env.DEV) {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
}

prepare()
  .then(async () => {
    const manifest = await loadManifest()
    const ordered = resolveLoadOrder(manifest.mfes) // valida ciclo; ordem de carga
    const router = createAppRouter(ordered)
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Providers>
          <RouterProvider router={router} />
        </Providers>
      </StrictMode>,
    )
  })
  .catch((err) => {
    document.getElementById('root')!.innerHTML =
      `<pre style="padding:2rem;color:#b91c1c;font-family:monospace">Falha ao iniciar o portal:\n${String(err)}</pre>`
  })
```

- [ ] **Step 3: Criar o manifesto de desenvolvimento**

Create: `public/mfe-manifest.json`

```json
{
  "schemaVersion": 1,
  "mfes": [
    {
      "id": "endereco",
      "name": "Alteração de Endereço",
      "state": "active",
      "url": "http://localhost:4566/mfe-endereco/endereco.js",
      "route": "/endereco",
      "dependsOn": []
    }
  ]
}
```

- [ ] **Step 4: Verificar build, lint e testes**

Run: `npm run type-check && npm run lint && npm test`
Expected: PASS (todos os testes verdes; sem erros de fronteira/lint)

- [ ] **Step 5: Commit**

```bash
git add src/app/router/index.tsx src/main.tsx public/mfe-manifest.json
git commit -m "feat(shell): router dinamico e boot com carregamento de manifesto"
```

---

### Task 10: README do runtime de MFE (mapa código → decisão)

**Files:**
- Create: `src/app/mfe/README.md`

- [ ] **Step 1: Escrever o README**

```markdown
# Runtime de Microfrontends (camada `app`)

Motor que carrega MFEs autônomos a partir de buckets S3 em runtime. Ver ADR-008/009/010.

| Arquivo | Responsabilidade | Decisão |
|---------|------------------|---------|
| [`types.ts`](types.ts) | Tipos do manifesto e do contrato `MfeMountContext`/`MfeModule` | ADR-009 |
| [`manifest.ts`](manifest.ts) | Validação fail-fast do manifesto | ADR-010 |
| [`dependencyResolver.ts`](dependencyResolver.ts) | Ordenação topológica + detecção de ciclo | ADR-010 |
| [`loadManifest.ts`](loadManifest.ts) | Carrega `public/mfe-manifest.json` via fetch | ADR-010 |
| [`loadMfeModule.ts`](loadMfeModule.ts) | `import()` ESM do bundle + validação do contrato | ADR-009 |
| [`MfeHost.tsx`](MfeHost.tsx) | Monta/desmonta o MFE numa `<div>`; injeta o contexto | ADR-009 |
| [`MfeErrorBoundary.tsx`](MfeErrorBoundary.tsx) | Isola falhas de um MFE do shell | ADR-008 |
```

- [ ] **Step 2: Commit**

```bash
git add src/app/mfe/README.md
git commit -m "docs(mfe): README do runtime com mapa codigo-decisao"
```

---

## Fase 2 — MFE de endereço (em `mfe-endereco/`, repo novo)

> Trabalhe no diretório `/Volumes/Marco-Dev/dev/mfe-endereco`. Repo git independente.

### Task 11: Scaffold do repo `mfe-endereco`

**Files:**
- Create: `mfe-endereco/package.json`
- Create: `mfe-endereco/tsconfig.json`
- Create: `mfe-endereco/vite.config.ts`
- Create: `mfe-endereco/vitest.config.ts`
- Create: `mfe-endereco/.gitignore`

- [ ] **Step 1: Inicializar o repositório e instalar dependências**

```bash
mkdir -p /Volumes/Marco-Dev/dev/mfe-endereco && cd /Volumes/Marco-Dev/dev/mfe-endereco
git init
npm init -y
npm install react@^19.2.6 react-dom@^19.2.6 react-hook-form@^7.76.1
npm install -D typescript@~6.0.2 vite@^8.0.12 @vitejs/plugin-react@^6.0.1 \
  vitest@^4.1.7 @vitest/coverage-v8@^4.1.7 jsdom@^29.1.1 \
  @testing-library/react@^16.3.2 @testing-library/jest-dom@^6.9.1 \
  @testing-library/user-event@^14.6.1 @types/react@^19.2.14 @types/react-dom@^19.2.3 \
  msw@^2.14.6
```

- [ ] **Step 2: Criar `.gitignore`**

```
node_modules
dist
coverage
```

- [ ] **Step 3: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Criar `vite.config.ts` (lib mode → ESM único)**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      formats: ['es'],
      fileName: () => 'endereco.js',
    },
    // React fica embutido no bundle (MFE autônomo) — NÃO marcar como external.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
```

- [ ] **Step 5: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: ['src/mocks/**', 'src/test-setup.ts', 'src/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
```

- [ ] **Step 6: Ajustar `package.json` (scripts + type module)**

Editar `mfe-endereco/package.json` para conter:

```json
{
  "name": "mfe-endereco",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "deploy": "node --experimental-strip-types scripts/deploy.ts"
  }
}
```

- [ ] **Step 7: Criar `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold do repo mfe-endereco (vite lib mode + vitest)"
```

---

### Task 12: Cliente HTTP do MFE (autônomo)

Cada MFE tem seu próprio httpClient — não importa nada do shell. Recebe `apiUrl`/`token` por parâmetro.

**Files:**
- Create: `mfe-endereco/src/api/httpClient.ts`
- Test: `mfe-endereco/src/api/__tests__/httpClient.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// mfe-endereco/src/api/__tests__/httpClient.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHttpClient } from '../httpClient'

afterEach(() => vi.restoreAllMocks())

describe('createHttpClient', () => {
  it('injeta Bearer token e base url', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
    vi.stubGlobal('fetch', fetchMock)
    const client = createHttpClient({ apiUrl: 'http://api', token: 't1', onUnauthorized: () => {} })
    await client('/enderecos')
    expect(fetchMock).toHaveBeenCalledWith('http://api/enderecos', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer t1' }),
    }))
  })

  it('chama onUnauthorized em 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))
    const onUnauthorized = vi.fn()
    const client = createHttpClient({ apiUrl: 'http://api', token: 't1', onUnauthorized })
    await expect(client('/enderecos')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/api/__tests__/httpClient.test.ts`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```ts
// mfe-endereco/src/api/httpClient.ts
export interface HttpClientDeps {
  apiUrl: string
  token: string | null
  onUnauthorized: () => void
}

export function createHttpClient(deps: HttpClientDeps) {
  return async function client<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${deps.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(deps.token ? { Authorization: `Bearer ${deps.token}` } : {}),
        ...options.headers,
      },
    })
    if (res.status === 401) {
      deps.onUnauthorized()
      throw new Error('Sessão expirada')
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<T>
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/api/__tests__/httpClient.test.ts`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/api
git commit -m "feat(endereco): httpClient autonomo do MFE"
```

---

### Task 13: Formulário de endereço

**Files:**
- Create: `mfe-endereco/src/EnderecoForm.tsx`
- Test: `mfe-endereco/src/__tests__/EnderecoForm.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// mfe-endereco/src/__tests__/EnderecoForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnderecoForm } from '../EnderecoForm'

describe('EnderecoForm', () => {
  it('renderiza os campos com valores iniciais', () => {
    render(<EnderecoForm initial={{ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' }} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/CEP/i)).toHaveValue('01001000')
    expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Praça da Sé')
  })

  it('chama onSubmit com os dados ao salvar', async () => {
    const onSubmit = vi.fn()
    render(<EnderecoForm initial={{ cep: '', logradouro: '', numero: '' }} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/CEP/i), '01001000')
    await userEvent.type(screen.getByLabelText(/Logradouro/i), 'Praça da Sé')
    await userEvent.type(screen.getByLabelText(/Número/i), '1')
    await userEvent.click(screen.getByRole('button', { name: /Salvar/i }))
    expect(onSubmit).toHaveBeenCalledWith({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/__tests__/EnderecoForm.test.tsx`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```tsx
// mfe-endereco/src/EnderecoForm.tsx
import { useForm } from 'react-hook-form'

export interface Endereco {
  cep: string
  logradouro: string
  numero: string
}

export function EnderecoForm({ initial, onSubmit }: { initial: Endereco; onSubmit: (e: Endereco) => void }) {
  const { register, handleSubmit } = useForm<Endereco>({ defaultValues: initial })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">CEP<input {...register('cep')} className="rounded border p-2" /></label>
      <label className="flex flex-col gap-1">Logradouro<input {...register('logradouro')} className="rounded border p-2" /></label>
      <label className="flex flex-col gap-1">Número<input {...register('numero')} className="rounded border p-2" /></label>
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Salvar</button>
    </form>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/__tests__/EnderecoForm.test.tsx`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/EnderecoForm.tsx src/__tests__/EnderecoForm.test.tsx
git commit -m "feat(endereco): formulario de alteracao de endereco"
```

---

### Task 14: App do MFE (carrega + salva endereço)

**Files:**
- Create: `mfe-endereco/src/EnderecoApp.tsx`
- Test: `mfe-endereco/src/__tests__/EnderecoApp.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// mfe-endereco/src/__tests__/EnderecoApp.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { EnderecoApp } from '../EnderecoApp'

afterEach(() => vi.restoreAllMocks())

describe('EnderecoApp', () => {
  it('carrega o endereço atual da API e exibe no formulário', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' })),
    ))
    render(<EnderecoApp ctx={{ apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/endereco' }} />)
    await waitFor(() => expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Praça da Sé'))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/__tests__/EnderecoApp.test.tsx`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```tsx
// mfe-endereco/src/EnderecoApp.tsx
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
```

- [ ] **Step 4: Criar o tipo do contrato (cópia local — MFE é autônomo)**

Create: `mfe-endereco/src/contract.ts`

```ts
// Contrato publicado pelo shell (ADR-009). Cópia local para manter o MFE autônomo.
export interface MfeMountContext {
  apiUrl: string
  token: string | null
  onUnauthorized: () => void
  basePath: string
}
export interface MfeModule {
  mount: (el: HTMLElement, ctx: MfeMountContext) => void
  unmount: (el: HTMLElement) => void
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/__tests__/EnderecoApp.test.tsx`
Expected: PASS (1 teste)

- [ ] **Step 6: Commit**

```bash
git add src/EnderecoApp.tsx src/contract.ts src/__tests__/EnderecoApp.test.tsx
git commit -m "feat(endereco): app que carrega e salva endereco via API"
```

---

### Task 15: Ponto de entrada — implementa o contrato `mount`/`unmount`

**Files:**
- Create: `mfe-endereco/src/index.tsx`
- Test: `mfe-endereco/src/__tests__/contract.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
// mfe-endereco/src/__tests__/contract.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, unmount } from '../index'

afterEach(() => vi.restoreAllMocks())

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/endereco' }

describe('contrato mount/unmount', () => {
  it('mount renderiza conteúdo dentro do elemento', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ cep: '', logradouro: '', numero: '' }))))
    const el = document.createElement('div')
    mount(el, ctx)
    await vi.waitFor(() => expect(el.textContent).toMatch(/Endereço/i))
  })

  it('unmount esvazia o elemento', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ cep: '', logradouro: '', numero: '' }))))
    const el = document.createElement('div')
    mount(el, ctx)
    await vi.waitFor(() => expect(el.childElementCount).toBeGreaterThan(0))
    unmount(el)
    expect(el.childElementCount).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/__tests__/contract.test.tsx`
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```tsx
// mfe-endereco/src/index.tsx
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EnderecoApp } from './EnderecoApp'
import type { MfeMountContext } from './contract'

const roots = new WeakMap<HTMLElement, Root>()

export function mount(el: HTMLElement, ctx: MfeMountContext): void {
  const root = createRoot(el)
  roots.set(el, root)
  root.render(
    <StrictMode>
      <EnderecoApp ctx={ctx} />
    </StrictMode>,
  )
}

export function unmount(el: HTMLElement): void {
  roots.get(el)?.unmount()
  roots.delete(el)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/__tests__/contract.test.tsx`
Expected: PASS (2 testes)

- [ ] **Step 5: Verificar build em lib mode**

Run: `npm run build`
Expected: gera `dist/endereco.js` (ESM único)

- [ ] **Step 6: Verificar cobertura**

Run: `npm run test:coverage`
Expected: cobertura ≥ 80% (thresholds passam)

- [ ] **Step 7: Commit**

```bash
git add src/index.tsx vite.config.ts package.json src/__tests__/contract.test.tsx
git commit -m "feat(endereco): ponto de entrada implementando contrato mount/unmount"
```

---

### Task 16: README do MFE de endereço

**Files:**
- Create: `mfe-endereco/README.md`

- [ ] **Step 1: Escrever o README**

```markdown
# mfe-endereco

Microfrontend autônomo de alteração de endereço. Buildado em Vite lib mode (ESM único),
deployado num bucket S3 (LocalStack) e carregado pelo shell via `import()`.

| Arquivo | Responsabilidade | Decisão |
|---------|------------------|---------|
| [`src/index.tsx`](src/index.tsx) | Contrato `mount`/`unmount` (ponto de entrada) | ADR-009 |
| [`src/EnderecoApp.tsx`](src/EnderecoApp.tsx) | Orquestra carga/salvamento via API | ADR-008 |
| [`src/EnderecoForm.tsx`](src/EnderecoForm.tsx) | Formulário (react-hook-form) | — |
| [`src/api/httpClient.ts`](src/api/httpClient.ts) | Cliente HTTP autônomo (sem dep do shell) | ADR-008 |
| [`src/contract.ts`](src/contract.ts) | Cópia local do contrato do shell | ADR-009 |
| [`vite.config.ts`](vite.config.ts) | Build lib mode → `dist/endereco.js` | ADR-011 |
| [`scripts/deploy.ts`](scripts/deploy.ts) | Upload para bucket LocalStack | ADR-011 |

## Comandos
- `npm run build` — gera `dist/endereco.js`
- `npm run deploy` — sobe o bundle para o bucket `mfe-endereco` no LocalStack
- `npm run test:coverage` — testes + cobertura (≥ 80%)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(endereco): README com mapa codigo-decisao"
```

---

## Fase 3 — Infraestrutura e deploy

### Task 17: docker-compose com LocalStack (em `arkhi-mfe-infra/`)

**Files:**
- Create: `arkhi-mfe-infra/docker-compose.yml`
- Create: `arkhi-mfe-infra/README.md`

- [ ] **Step 1: Criar o repo de infra e o compose**

```bash
mkdir -p /Volumes/Marco-Dev/dev/arkhi-mfe-infra && cd /Volumes/Marco-Dev/dev/arkhi-mfe-infra
git init
```

Create: `docker-compose.yml`

```yaml
services:
  localstack:
    image: localstack/localstack:3
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3
      - DEBUG=0
    volumes:
      - "./.localstack:/var/lib/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
```

- [ ] **Step 2: Criar README de infra**

Create: `README.md`

```markdown
# arkhi-mfe-infra

Orquestração local da plataforma de microfrontends.

## Subir o ambiente
```bash
docker compose up -d        # LocalStack S3 em :4566
```
Depois, em cada MFE: `npm run build && npm run deploy`.
Por fim, no shell (`frontend-react`): `npm run dev`.
```

- [ ] **Step 3: Subir e validar**

Run: `docker compose up -d && sleep 5 && curl -s http://localhost:4566/_localstack/health`
Expected: JSON com `"s3"` disponível

- [ ] **Step 4: Commit**

```bash
echo ".localstack/" > .gitignore
git add -A
git commit -m "chore(infra): docker-compose com LocalStack S3"
```

---

### Task 18: Script de deploy do MFE para o S3 (em `mfe-endereco/`)

**Files:**
- Create: `mfe-endereco/scripts/deploy.ts`

- [ ] **Step 1: Instalar o AWS SDK v3**

```bash
cd /Volumes/Marco-Dev/dev/mfe-endereco
npm install -D @aws-sdk/client-s3@^3
```

- [ ] **Step 2: Implementar o deploy**

```ts
// mfe-endereco/scripts/deploy.ts
import { readFileSync } from 'node:fs'
import { S3Client, CreateBucketCommand, PutObjectCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3'

const BUCKET = 'mfe-endereco'
const ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:4566'

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
})

async function ensureBucket() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
  } catch (err) {
    if ((err as { name?: string }).name !== 'BucketAlreadyOwnedByYou') {
      // LocalStack costuma ser idempotente; ignora "já existe"
    }
  }
  await s3.send(new PutBucketPolicyCommand({
    Bucket: BUCKET,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${BUCKET}/*` }],
    }),
  }))
}

async function main() {
  await ensureBucket()
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: 'endereco.js',
    Body: readFileSync('dist/endereco.js'),
    ContentType: 'application/javascript',
  }))
  console.log(`✅ deploy: ${ENDPOINT}/${BUCKET}/endereco.js`)
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Build + deploy e validar via HTTP**

Run (com LocalStack no ar):
```bash
npm run build && npm run deploy
curl -s -o /dev/null -w "%{http_code}" http://localhost:4566/mfe-endereco/endereco.js
```
Expected: `deploy` imprime a URL; `curl` retorna `200`

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy.ts package.json
git commit -m "feat(endereco): script de deploy do bundle para S3 (LocalStack)"
```

---

### Task 19: Handlers MSW de endereço no shell (para dev/E2E)

O shell, em dev, responde às chamadas do MFE (`/usuario/endereco`). Em produção isso seria o back-end real.

**Files:**
- Modify: `src/mocks/handlers.ts` (adiciona handlers de endereço)

- [ ] **Step 1: Adicionar os handlers**

Adicionar ao array `handlers` em `src/mocks/handlers.ts`:

```ts
  http.get('/usuario/endereco', () =>
    HttpResponse.json({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' }),
  ),
  http.put('/usuario/endereco', async ({ request }) =>
    HttpResponse.json(await request.json()),
  ),
```

(o import `http, HttpResponse` já existe no topo do arquivo)

- [ ] **Step 2: Verificar testes do shell**

Run: `npm test`
Expected: PASS (nenhum teste quebrado)

- [ ] **Step 3: Commit**

```bash
git add src/mocks/handlers.ts
git commit -m "feat(mocks): handlers de endereco para dev/E2E do shell"
```

---

## Fase 4 — E2E (Playwright, no shell)

### Task 20: E2E do fluxo de MFE + isolamento de falha

> Pré-requisito: LocalStack no ar e `mfe-endereco` deployado (`dist/endereco.js` no bucket).

**Files:**
- Create: `tests/e2e/mfe-endereco.spec.ts`
- Modify: `src/pages/login/index.tsx` (login mínimo para o E2E autenticar) — ver Step 1

- [ ] **Step 1: Login mínimo funcional (necessário para o E2E)**

Substituir `src/pages/login/index.tsx`:

```tsx
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login } from '@/shared/lib/store/authSlice'
import { TEST_TOKEN } from '@/mocks/handlers'
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
```

> `app` importando de `mocks` viola o boundary FSD. Para evitar isso, exporte `TEST_TOKEN` de `src/shared/auth/testToken.ts` e importe-o tanto no handler quanto aqui. Crie `src/shared/auth/testToken.ts` com `export const TEST_TOKEN = '...'` (mova a constante de `handlers.ts`) e ajuste o import em `handlers.ts`.

- [ ] **Step 2: Escrever o teste E2E**

```ts
// tests/e2e/mfe-endereco.spec.ts
import { test, expect } from '@playwright/test'

test('carrega o MFE de endereço dinamicamente e salva', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.getByRole('link', { name: /Alteração de Endereço/ }).click()
  await expect(page).toHaveURL(/\/endereco/)

  // O bundle vem do bucket S3 (LocalStack) e monta dentro da <div data-mfe="endereco">
  const host = page.locator('[data-mfe="endereco"]')
  await expect(host.getByLabel(/Logradouro/i)).toHaveValue('Praça da Sé')

  await host.getByLabel(/Número/i).fill('42')
  await host.getByRole('button', { name: /Salvar/i }).click()
  await expect(host.getByRole('status')).toHaveText(/atualizado/i)
})

test('shell sobrevive a um MFE que falha ao carregar', async ({ page }) => {
  // Bloqueia o bundle para simular bucket indisponível
  await page.route('**/mfe-endereco/endereco.js', (r) => r.abort())
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: /Alteração de Endereço/ }).click()
  await expect(page.getByRole('alert')).toContainText(/indisponível/i)
  // O menu (shell) continua presente
  await expect(page.getByRole('link', { name: 'Início' })).toBeVisible()
})
```

- [ ] **Step 3: Rodar o E2E**

Run (LocalStack no ar + MFE deployado):
```bash
npm run test:e2e -- mfe-endereco.spec.ts
```
Expected: PASS (2 testes)

> Nota: o `vite dev` precisa servir o `import()` cross-origin do `:4566`. Como o bundle é ESM público no LocalStack, o `import(url)` absoluto funciona; se houver bloqueio de CORS, adicione `Access-Control-Allow-Origin: *` na policy do bucket ou sirva via proxy do Vite.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/mfe-endereco.spec.ts src/pages/login/index.tsx src/shared/auth/testToken.ts src/mocks/handlers.ts
git commit -m "test(e2e): fluxo de carregamento dinamico do MFE e isolamento de falha"
```

---

## Fase 5 — Documentação arquitetural (ADRs)

> No repo `frontend-react`. Seguem o formato dos ADRs existentes em `docs/architecture/adrs/`.

### Task 21: ADR-008 — Arquitetura de microfrontends dinâmicos

**Files:**
- Create: `docs/architecture/adrs/ADR-008-microfrontends-dinamicos.md`

- [ ] **Step 1: Escrever o ADR** (visão geral: shell nuclear imutável, MFEs em S3 injetados na home, isolamento, comunicação só com back-end; diagrama de containers atualizado com buckets S3/LocalStack; links para `src/app/mfe/` e `public/mfe-manifest.json`). Seguir a estrutura de ADR-002 (Contexto, Drivers, Opções, Decisão, Y-Statement, Consequências, Validação, Links, Histórico).

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/adrs/ADR-008-microfrontends-dinamicos.md
git commit -m "docs(adr): ADR-008 arquitetura de microfrontends dinamicos"
```

---

### Task 22: ADR-009 — Contrato `mount`/`unmount` (o robusto)

**Files:**
- Create: `docs/architecture/adrs/ADR-009-contrato-mount-unmount.md`

- [ ] **Step 1: Escrever o ADR robusto**, cobrindo:
  - Contexto: necessidade de integração runtime de bundles independentes.
  - Opções: (1) contrato `mount`/`unmount` via Vite lib mode + `import()` ESM nativo **[escolhida]**; (2) Module Federation (`@originjs/vite-plugin-federation`); (3) Web Components/Shadow DOM.
  - Por que Module Federation foi **descartado**: seu valor é *compartilhar* deps (React singleton), o que contraria "MFE autônomo, sem deps entre si"; acopla versões e adiciona runtime de federação.
  - Contrato formal (assinatura `MfeMountContext`, `mount`, `unmount`), regras de validação, ciclo de vida (mount na rota / unmount ao sair / remontagem por mudança de token).
  - Trade-offs aceitos: cada MFE empacota o próprio React (bundle maior) — preço da autonomia.
  - Links: `src/app/mfe/types.ts`, `loadMfeModule.ts`, `MfeHost.tsx`, `mfe-endereco/src/index.tsx`.

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/adrs/ADR-009-contrato-mount-unmount.md
git commit -m "docs(adr): ADR-009 contrato mount/unmount entre shell e MFEs"
```

---

### Task 23: ADR-010 e ADR-011

**Files:**
- Create: `docs/architecture/adrs/ADR-010-manifesto-e-dependencias.md`
- Create: `docs/architecture/adrs/ADR-011-deploy-s3-localstack.md`

- [ ] **Step 1: ADR-010** — manifesto separado do `config.json`, estados (`active`/`disabled`/`maintenance`), `dependsOn`, ordenação topológica + detecção de ciclo, validação fail-fast. Links: `manifest.ts`, `dependencyResolver.ts`, `public/mfe-manifest.json`.

- [ ] **Step 2: ADR-011** — build independente em Vite lib mode, bucket S3 por MFE (LocalStack), deploy via AWS SDK v3, mín. 3 repos para 2 MFEs (escrita restrita via CODEOWNERS). Links: `mfe-endereco/vite.config.ts`, `scripts/deploy.ts`, `arkhi-mfe-infra/docker-compose.yml`.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/adrs/ADR-010-manifesto-e-dependencias.md docs/architecture/adrs/ADR-011-deploy-s3-localstack.md
git commit -m "docs(adr): ADR-010 manifesto/dependencias e ADR-011 deploy S3"
```

---

### Task 24: Atualizar o README de arquitetura

**Files:**
- Modify: `docs/architecture/README.md` (mapa de módulos + tabela de ADRs + diagrama de containers)

- [ ] **Step 1: Atualizar**
  - Adicionar `src/app/mfe/` e `src/app/layout/` ao **Mapa de Módulos** (com link para `src/app/mfe/README.md`).
  - Adicionar ADR-008..011 à tabela de **Decisões Arquiteturais**.
  - Atualizar o **Diagrama de Containers** incluindo os buckets S3 (LocalStack) e o carregamento dinâmico dos MFEs.

- [ ] **Step 2: Verificar build/lint/testes finais do shell**

Run: `npm run type-check && npm run lint && npm run lint:css && npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/README.md
git commit -m "docs(arch): mapa de modulos e ADRs da plataforma de microfrontends"
```

---

## Verificação final (Sub-projeto A)

- [ ] No shell: `npm run type-check && npm run lint && npm test` → tudo verde.
- [ ] No `mfe-endereco`: `npm run build && npm run test:coverage` → bundle gerado, cobertura ≥ 80%.
- [ ] LocalStack no ar + `npm run deploy` → `curl http://localhost:4566/mfe-endereco/endereco.js` retorna 200.
- [ ] `npm run test:e2e` no shell → fluxo dinâmico passa **e** o teste de isolamento de falha passa.
- [ ] ADR-008..011 escritos e linkados; `src/app/mfe/README.md` e `mfe-endereco/README.md` presentes.

Concluído o Sub-projeto A, o **Sub-projeto B (`mfe-emprestimo`)** segue o mesmo padrão das Tasks 11–18, adicionando uma entrada ao `public/mfe-manifest.json` com `dependsOn: ["endereco"]` — provando que adicionar um MFE não toca o shell nem o `mfe-endereco`.
