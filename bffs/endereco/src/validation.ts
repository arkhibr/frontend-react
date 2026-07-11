import type { Endereco } from './legacyBackend.ts'

type Validation = { ok: true; value: Endereco } | { ok: false; message: string }

export function validateEndereco(value: unknown): Validation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, message: 'Endereço inválido.' }
  }
  const body = value as Record<string, unknown>
  const allowed = new Set(['cep', 'logradouro', 'numero'])
  if (Object.keys(body).some((key) => !allowed.has(key))) return { ok: false, message: 'Campos não permitidos.' }
  if (typeof body.cep !== 'string' || !/^\d{8}$/.test(body.cep)) return { ok: false, message: 'CEP inválido.' }
  if (typeof body.logradouro !== 'string' || body.logradouro.trim().length < 3 || body.logradouro.trim().length > 120) {
    return { ok: false, message: 'Logradouro inválido.' }
  }
  if (typeof body.numero !== 'string' || body.numero.trim().length < 1 || body.numero.trim().length > 20) {
    return { ok: false, message: 'Número inválido.' }
  }
  return { ok: true, value: { cep: body.cep, logradouro: body.logradouro.trim(), numero: body.numero.trim() } }
}
