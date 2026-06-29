import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ConsultaScreen } from '../consultas'
import { createApi } from '../../api/endpoints'

const ctx = { apiUrl: 'http://api', token: 't', onUnauthorized: () => {}, basePath: '/emprestimos' }
afterEach(() => vi.restoreAllMocks())

describe('ConsultaScreen', () => {
  it('extrato: renderiza os movimentos numa tabela', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      Contrato: '123456-7', MovimentoDeEmprestimo: [
        { TipoLancamento: 'Debito', Data: '2026-06-10', Historico: 'Prestação mensal', Valor: 944.3, Saldo: 10189.8 },
      ],
    }))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-extrato', contrato: '123456-7' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('Prestação mensal')).toBeInTheDocument())
  })

  it('atraso: lista parcelas em atraso', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ParcelasEmAtraso: [{ NumeroDoContrato: '654321-0', VencimentoDaParcela: '2026-05-05',
        ValorDaPrestacao: 615.8, ValorDoSaldoAtual: 4320.12, LinhaDeEmprestimo: 'Refin',
        DataDoProximoVencimento: '2026-07-05', ValorNoProximoVencimento: 630.1 }],
    }))))
    render(<ConsultaScreen api={createApi(ctx)} view={{ tela: 'emprestimo-atraso', contrato: '654321-0' }} voltar={() => {}} />)
    await waitFor(() => expect(screen.getByText('2026-05-05')).toBeInTheDocument())
  })
})
