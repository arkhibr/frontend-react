import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EmprestimoApp } from './EmprestimoApp'
import { injectTheme } from './theme/inject'
import type { MfeMountContext } from './contract'

const roots = new WeakMap<HTMLElement, Root>()
const containers = new WeakMap<HTMLElement, HTMLElement>()
const disposers = new WeakMap<HTMLElement, () => void>()

export function mount(el: HTMLElement, ctx: MfeMountContext): void {
  disposers.set(el, injectTheme(el))
  const container = document.createElement('div')
  container.setAttribute('data-emprestimo-root', '')
  el.append(container)
  containers.set(el, container)

  const root = createRoot(container)
  roots.set(el, root)
  root.render(<StrictMode><EmprestimoApp ctx={ctx} /></StrictMode>)
}

export function unmount(el: HTMLElement): void {
  roots.get(el)?.unmount()
  roots.delete(el)
  containers.get(el)?.remove()
  containers.delete(el)
  disposers.get(el)?.()
  disposers.delete(el)
}
