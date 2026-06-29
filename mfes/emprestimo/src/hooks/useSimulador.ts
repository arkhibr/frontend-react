import { useState } from 'react'
import type { LinhaDeCredito } from '../domain'

export type PassoSimulador = 'parametros' | 'valores' | 'resultado' | 'termo' | 'enviado'

export interface EstadoSimulador {
  passo: PassoSimulador
  linha: LinhaDeCredito | null
  valorLiquido: number
  parcelas: number
}

export function useSimulador() {
  const [estado, setEstado] = useState<EstadoSimulador>({
    passo: 'parametros', linha: null, valorLiquido: 0, parcelas: 0,
  })
  return {
    estado,
    escolherLinha: (linha: LinhaDeCredito) =>
      setEstado((s) => ({ ...s, linha, passo: 'valores' })),
    definirValores: (valorLiquido: number, parcelas: number) =>
      setEstado((s) => ({ ...s, valorLiquido, parcelas, passo: 'resultado' })),
    irPara: (passo: PassoSimulador) => setEstado((s) => ({ ...s, passo })),
  }
}
