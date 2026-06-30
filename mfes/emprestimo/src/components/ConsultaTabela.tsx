import { useAsync } from '../hooks/useAsync'
import { CardBase, EmptyState, HeaderMarca } from './ui'

export interface Coluna<T> { cabecalho: string; valor: (item: T) => string }

export function ConsultaTabela<T>(
  { titulo, colunas, carregar, voltar }:
  { titulo: string; colunas: Coluna<T>[]; carregar: () => Promise<T[]>; voltar: () => void },
) {
  const { data, loading, error } = useAsync(carregar, [titulo])
  return (
    <section className="emprestimo-screen">
      <HeaderMarca titulo={titulo} subtitulo="Consulta detalhada da operação selecionada." onVoltar={voltar} />
      {loading ? <p className="emprestimo-feedback">Carregando...</p>
        : error ? <p role="alert">Falha ao carregar.</p>
        : (data ?? []).length === 0 ? <EmptyState titulo="Nenhum registro encontrado" descricao="Esta consulta não retornou movimentações para o contrato." />
        : (
          <CardBase className="emprestimo-table-card">
            <table className="emprestimo-tabela">
              <thead><tr>{colunas.map((c) => <th key={c.cabecalho}>{c.cabecalho}</th>)}</tr></thead>
              <tbody>
                {(data ?? []).map((item, i) => (
                  <tr key={i}>{colunas.map((c) => <td key={c.cabecalho}>{c.valor(item)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </CardBase>
        )}
    </section>
  )
}
