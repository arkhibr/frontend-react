import { useState, type ReactNode } from 'react'

export function HeaderMarca({ titulo, onVoltar }: { titulo: string; onVoltar?: () => void }) {
  return (
    <header className="poc-header">
      {onVoltar && <button className="poc-header__voltar" aria-label="Voltar" onClick={onVoltar}>←</button>}
      <h2 className="poc-header__titulo">{titulo}</h2>
    </header>
  )
}

export function CardBase({ children }: { children: ReactNode }) {
  return <div className="poc-card">{children}</div>
}

export function FeatureButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="poc-feature-button" onClick={onClick}>{children}</button>
}

export function ActionButton(
  { children, onClick, variante = 'primario' }:
  { children: ReactNode; onClick: () => void; variante?: 'primario' | 'secundario' },
) {
  return <button className={`poc-action-button poc-action-button--${variante}`} onClick={onClick}>{children}</button>
}

export function ChipStatus({ texto, tom }: { texto: string; tom: 'ok' | 'aviso' | 'erro' }) {
  return <span className={`poc-chip poc-chip--${tom}`}>{texto}</span>
}

export function BlocoExpansivel({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="poc-bloco">
      <button className="poc-bloco__cabecalho" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        {titulo}
      </button>
      {aberto && <div className="poc-bloco__corpo">{children}</div>}
    </div>
  )
}
