// STUB — implementação real na Task 14
import type { EmprestimoApi } from '../api/endpoints'
import type { useSimulador } from '../hooks/useSimulador'

interface ResultadoEnvioProps {
  api: EmprestimoApi
  sim: ReturnType<typeof useSimulador>
  tipo?: 'refinanciar'
  voltar: () => void
}

export function ResultadoEnvio(_props: ResultadoEnvioProps) {
  return <p>Resultado…</p>
}
