/** True quando a Performance API (mark/measure) está disponível. */
function supported(): boolean {
  return (
    typeof performance !== 'undefined' &&
    typeof performance.mark === 'function' &&
    typeof performance.measure === 'function'
  )
}

const startName = (id: string, phase: string) => `mfe:${id}:${phase}:start`
const measureName = (id: string, phase: string) => `mfe:${id}:${phase}`

/** Marca o início de uma fase de carga do MFE. */
export function markStart(id: string, phase: string): void {
  if (!supported()) return
  performance.mark(startName(id, phase))
}

/**
 * Fecha a fase criando um measure `mfe:<id>:<phase>` do start até agora.
 * No-op silencioso se o start não existir ou a API não estiver disponível.
 */
export function markEnd(id: string, phase: string): void {
  if (!supported()) return
  try {
    performance.measure(measureName(id, phase), startName(id, phase))
  } catch {
    // start mark ausente — ignora
  }
}
