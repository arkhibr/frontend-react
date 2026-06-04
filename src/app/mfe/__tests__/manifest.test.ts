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
