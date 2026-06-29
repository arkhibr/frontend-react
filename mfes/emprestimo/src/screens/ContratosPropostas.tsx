import { useState } from 'react'
import type { EmprestimoApi } from '../api/endpoints'
import type { View } from '../domain'
import { useAsync } from '../hooks/useAsync'
import { toContrato, toProposta } from '../mappers'
import { HeaderMarca, CardBase, ChipStatus, FeatureButton } from '../components/poc'

export function ContratosPropostas({ api, ir }: { api: EmprestimoApi; ir: (v: View) => void }) {
  const [aba, setAba] = useState<'contratos' | 'propostas'>('contratos')
  const contratos = useAsync(() => api.listarContratos(), [])
  const propostas = useAsync(() => api.listarPropostas(), [])

  return (
    <section>
      <HeaderMarca titulo="Empréstimos" />
      <FeatureButton onClick={() => ir({ tela: 'emprestimo-simulador' })}>Simular novo empréstimo</FeatureButton>
      <nav className="poc-abas" role="tablist">
        <button role="tab" aria-selected={aba === 'contratos'} onClick={() => setAba('contratos')}>Contratos</button>
        <button role="tab" aria-selected={aba === 'propostas'} onClick={() => setAba('propostas')}>Propostas</button>
      </nav>

      {aba === 'contratos' && (
        contratos.loading ? <p>Carregando contratos…</p>
        : contratos.error ? <p role="alert">Não foi possível carregar os contratos.</p>
        : (contratos.data ?? []).map(toContrato).map((c) => (
          <CardBase key={c.numero}>
            <button className="poc-card__link" onClick={() => ir({ tela: 'emprestimo-contrato', contrato: c.numero })}>
              <strong>{c.numero}</strong> — {c.linhaDeCredito}
            </button>
            {c.temAtraso && <ChipStatus texto="Em atraso" tom="erro" />}
            <span>Saldo: {c.saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </CardBase>
        ))
      )}

      {aba === 'propostas' && (
        propostas.loading ? <p>Carregando propostas…</p>
        : propostas.error ? <p role="alert">Não foi possível carregar as propostas.</p>
        : (propostas.data ?? []).map(toProposta).map((p) => (
          <CardBase key={p.numero}>
            <strong>{p.numero}</strong> — {p.linhaDeCredito}
            <ChipStatus texto={p.status} tom="aviso" />
          </CardBase>
        ))
      )}
    </section>
  )
}
