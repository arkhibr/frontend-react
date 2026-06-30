import { useState, type ReactNode } from 'react'

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function HeaderMarca(
  { titulo, subtitulo, onVoltar, acao }:
  { titulo: string; subtitulo?: string; onVoltar?: () => void; acao?: ReactNode },
) {
  return (
    <header className="emprestimo-header">
      <div className="emprestimo-header__main">
        {onVoltar && <button className="emprestimo-header__voltar" aria-label="Voltar" onClick={onVoltar}>←</button>}
        <div>
          <h2 className="emprestimo-header__titulo">{titulo}</h2>
          {subtitulo && <p className="emprestimo-header__subtitulo">{subtitulo}</p>}
        </div>
      </div>
      {acao && <div className="emprestimo-header__acao">{acao}</div>}
    </header>
  )
}

export function CardBase({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('emprestimo-card', className)}>{children}</div>
}

export function FeatureButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="emprestimo-feature-button" onClick={onClick}>{children}</button>
}

export function ActionButton(
  { children, onClick, variante = 'primario', type = 'button', className }:
  {
    children: ReactNode
    onClick?: () => void
    variante?: 'primario' | 'secundario' | 'perigo'
    type?: 'button' | 'submit' | 'reset'
    className?: string
  },
) {
  return <button type={type} className={cx('emprestimo-action-button', `emprestimo-action-button--${variante}`, className)} onClick={onClick}>{children}</button>
}

export function ChipStatus({ texto, tom }: { texto: string; tom: 'ok' | 'aviso' | 'erro' }) {
  return <span className={`emprestimo-chip emprestimo-chip--${tom}`}>{texto}</span>
}

export function BlocoExpansivel({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="emprestimo-bloco">
      <button className="emprestimo-bloco__cabecalho" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        {titulo}
      </button>
      {aberto && <div className="emprestimo-bloco__corpo">{children}</div>}
    </div>
  )
}

export function Metric({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div className="emprestimo-metric">
      <span className="emprestimo-metric__rotulo">{rotulo}</span>
      <strong className="emprestimo-metric__valor">{valor}</strong>
      {detalhe && <span className="emprestimo-metric__detalhe">{detalhe}</span>}
    </div>
  )
}

export function EmptyState({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="emprestimo-empty" role="status">
      <strong>{titulo}</strong>
      <span>{descricao}</span>
    </div>
  )
}
