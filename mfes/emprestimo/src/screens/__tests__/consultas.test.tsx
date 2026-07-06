import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ConsultaScreen } from '../consultas'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

describe('ConsultaScreen', () => {
  it('extrato: renderiza os movimentos numa tabela', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ tipo: 'Debito', data: '2026-06-10', historico: 'Prestação mensal', valor: 944.3, saldo: 10189.8 }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-extrato', contrato: '123456-7' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('Prestação mensal')).toBeInTheDocument())
  })

  it('atraso: lista parcelas em atraso', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ contrato: '654321-0', vencimento: '2026-05-05', valorPrestacao: 615.8, saldoAtual: 4320.12, proximoVencimento: '2026-07-05' }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-atraso', contrato: '654321-0' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('2026-05-05')).toBeInTheDocument())
  })

  it('previsao: lista parcelas previstas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ numero: 1, vencimento: '2026-07-05', prestacao: 455.5, saldoAtual: 9000 }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-previsao', contrato: '001-A' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('2026-07-05')).toBeInTheDocument())
  })

  it('detalhamento: lista parcelas detalhadas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      [{ numero: 1, vencimento: '2026-07-05', prestacao: 455.5, status: 'Paga' }],
    ))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-detalhamento', contrato: '001-A' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('Paga')).toBeInTheDocument())
  })
})
