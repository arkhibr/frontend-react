import { useAsync } from '../hooks/useAsync'
import { HeaderMarca } from './poc'

export interface Coluna<T> { cabecalho: string; valor: (item: T) => string }

export function ConsultaTabela<T>(
  { titulo, colunas, carregar, voltar }:
  { titulo: string; colunas: Coluna<T>[]; carregar: () => Promise<T[]>; voltar: () => void },
) {
  const { data, loading, error } = useAsync(carregar, [titulo])
  return (
    <section>
      <HeaderMarca titulo={titulo} onVoltar={voltar} />
      {loading ? <p>Carregando…</p>
        : error ? <p role="alert">Falha ao carregar.</p>
        : (
          <table className="poc-tabela">
            <thead><tr>{colunas.map((c) => <th key={c.cabecalho}>{c.cabecalho}</th>)}</tr></thead>
            <tbody>
              {(data ?? []).map((item, i) => (
                <tr key={i}>{colunas.map((c) => <td key={c.cabecalho}>{c.valor(item)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
    </section>
  )
}
