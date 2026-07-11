import { describe, it, expect } from 'vitest'
import { validateManifest } from '../manifest'

const valid = {
  schemaVersion: 1,
  mfes: [
    { id: 'a', name: 'A', state: 'active', url: 'https://x/a.js', integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', route: '/a', dependsOn: [] },
    { id: 'b', name: 'B', state: 'maintenance', url: 'https://x/b.js', integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', route: '/b', dependsOn: ['a'] },
  ],
}
const options = { allowedOrigins: ['https://x'] }

describe('validateManifest', () => {
  it('aceita um manifesto válido e o retorna tipado', () => {
    expect(validateManifest(valid, options).mfes).toHaveLength(2)
  })

  it('rejeita schemaVersion desconhecida', () => {
    expect(() => validateManifest({ ...valid, schemaVersion: 99 }, options)).toThrow(/schemaVersion/)
  })

  it('rejeita quando mfes não é array', () => {
    expect(() => validateManifest({ schemaVersion: 1, mfes: {} }, options)).toThrow(/mfes/)
  })

  it('rejeita state inválido', () => {
    const bad = { schemaVersion: 1, mfes: [{ ...valid.mfes[0], state: 'ligado' }] }
    expect(() => validateManifest(bad, options)).toThrow(/state/)
  })

  it('rejeita campo obrigatório ausente', () => {
    const bad = { schemaVersion: 1, mfes: [{ id: 'a', name: 'A', state: 'active', route: '/a', dependsOn: [] }] }
    expect(() => validateManifest(bad, options)).toThrow(/url/)
  })

  it('rejeita dependsOn apontando para id inexistente', () => {
    const bad = { schemaVersion: 1, mfes: [{ ...valid.mfes[0], dependsOn: ['fantasma'] }] }
    expect(() => validateManifest(bad, options)).toThrow(/fantasma/)
  })

  it('rejeita id duplicado', () => {
    const bad = { schemaVersion: 1, mfes: [valid.mfes[0], valid.mfes[0]] }
    expect(() => validateManifest(bad, options)).toThrow(/duplicad/i)
  })

  it('rejeita origem não permitida, HTTP fora do localhost e integrity ausente', () => {
    expect(() => validateManifest(valid, { allowedOrigins: ['https://outro'] })).toThrow(/origem/)
    const http = { schemaVersion: 1, mfes: [{ ...valid.mfes[0], url: 'http://x/a.js' }] }
    expect(() => validateManifest(http, { allowedOrigins: ['http://x'] })).toThrow(/HTTPS/)
    const missingIntegrity = { schemaVersion: 1, mfes: [{ ...valid.mfes[0], integrity: '' }] }
    expect(() => validateManifest(missingIntegrity, options)).toThrow(/integrity/)
  })
})
