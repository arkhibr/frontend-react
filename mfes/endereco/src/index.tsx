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
