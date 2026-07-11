import { describe, it, expect } from 'vitest'
import { resolveLoadOrder } from '../dependencyResolver'
import type { MfeEntry } from '../types'

const mk = (id: string, dependsOn: string[] = []): MfeEntry => ({
  id, name: id, state: 'active', url: `http://x/${id}.js`, integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', route: `/${id}`, dependsOn,
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
