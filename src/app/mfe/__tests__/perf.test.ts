import { describe, it, expect, beforeEach, vi } from 'vitest'
import { markStart, markEnd } from '../perf'

const mfeMeasures = () =>
  performance.getEntriesByType('measure').filter((m) => m.name.startsWith('mfe:'))

describe('perf', () => {
  beforeEach(() => {
    performance.clearMarks()
    performance.clearMeasures()
  })

  it('cria um measure nomeado mfe:<id>:<phase> entre start e end', () => {
    markStart('endereco', 'mount')
    markEnd('endereco', 'mount')
    const measures = performance.getEntriesByName('mfe:endereco:mount', 'measure')
    expect(measures).toHaveLength(1)
    expect(measures[0]!.duration).toBeGreaterThanOrEqual(0)
  })

  it('não lança e não cria measure quando markEnd roda sem markStart', () => {
    expect(() => markEnd('endereco', 'mount')).not.toThrow()
    expect(mfeMeasures()).toHaveLength(0)
  })

  it('não lança quando performance é indefinido', () => {
    vi.stubGlobal('performance', undefined)
    expect(() => markStart('x', 'mount')).not.toThrow()
    expect(() => markEnd('x', 'mount')).not.toThrow()
    vi.unstubAllGlobals()
  })
})
