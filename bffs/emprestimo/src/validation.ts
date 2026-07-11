import type { AssinarTermoRequest, SimulacaoRequest, SolicitacaoDeProposta, TermoConsentimento } from './domain.ts'
import { obterParametrosSimulacao } from './legacyBackend.ts'

type Validation<T> = { ok: true; value: T } | { ok: false; message: string }

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function optionalIsoDate(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export function isResourceId(value: string): boolean {
  return /^[A-Z0-9-]{1,64}$/.test(value)
}

function validateCreditConditions(linhaCredito: unknown, valorLiquido: unknown, numeroParcelas: unknown): string | null {
  if (!finiteNumber(linhaCredito) || !Number.isInteger(linhaCredito)) return 'linhaCredito inválida.'
  if (!finiteNumber(valorLiquido)) return 'valorLiquido inválido.'
  if (!finiteNumber(numeroParcelas) || !Number.isInteger(numeroParcelas)) return 'numeroParcelas inválido.'
  const linha = obterParametrosSimulacao().find((item) => item.CodigoDaLinha === linhaCredito)
  if (!linha) return 'linhaCredito não encontrada.'
  if (valorLiquido < linha.ValorMinimo || valorLiquido > linha.ValorMaximo) return 'valorLiquido fora da faixa permitida.'
  if (numeroParcelas < linha.NumeroMinimoDeParcelas || numeroParcelas > linha.NumeroMaximoDeParcelas) return 'numeroParcelas fora da faixa permitida.'
  return null
}

export function validateProposal(value: unknown): Validation<SolicitacaoDeProposta> {
  const body = record(value)
  if (!body) return { ok: false, message: 'Corpo da proposta inválido.' }
  const error = validateCreditConditions(body.linhaCredito, body.valorLiquido, body.numeroParcelas)
  if (error) return { ok: false, message: error }
  if (!optionalIsoDate(body.dataLiberacao)) return { ok: false, message: 'dataLiberacao inválida.' }
  if (body.observacao !== undefined && (typeof body.observacao !== 'string' || body.observacao.length > 500)) {
    return { ok: false, message: 'observacao inválida.' }
  }
  return { ok: true, value: body as unknown as SolicitacaoDeProposta }
}

export function validateSimulacao(value: unknown): Validation<SimulacaoRequest> {
  const body = record(value)
  if (!body || !Array.isArray(body.numeroDeParcelas) || body.numeroDeParcelas.length === 0 || body.numeroDeParcelas.length > 12) {
    return { ok: false, message: 'numeroDeParcelas inválido.' }
  }
  const parcelas = body.numeroDeParcelas
  if (!parcelas.every((item) => finiteNumber(item) && Number.isInteger(item))) {
    return { ok: false, message: 'numeroDeParcelas inválido.' }
  }
  const firstError = validateCreditConditions(body.linhaDeCredito, body.valorLiquido, parcelas[0])
  if (firstError || !parcelas.every((item) => !validateCreditConditions(body.linhaDeCredito, body.valorLiquido, item))) {
    return { ok: false, message: firstError ?? 'numeroDeParcelas fora da faixa permitida.' }
  }
  if (!optionalIsoDate(body.dataDeLiberacao)) return { ok: false, message: 'dataDeLiberacao inválida.' }
  return { ok: true, value: body as unknown as SimulacaoRequest }
}

export function validateAssinatura(value: unknown): Validation<AssinarTermoRequest> {
  const body = record(value)
  if (!body || body.tipoDoTermoDeAceite !== 'PROPOSTA_WEB' || body.sistemaDeOrigem !== 'WEB') {
    return { ok: false, message: 'Assinatura de termo inválida.' }
  }
  return { ok: true, value: body as unknown as AssinarTermoRequest }
}

export function validateTermo(value: unknown): Validation<TermoConsentimento> {
  const body = record(value)
  if (!body || (body.textoDoTermo !== undefined && (typeof body.textoDoTermo !== 'string' || body.textoDoTermo.length > 20_000))) {
    return { ok: false, message: 'Termo inválido.' }
  }
  return { ok: true, value: body as TermoConsentimento }
}
