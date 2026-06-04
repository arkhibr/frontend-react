import { getApiUrl } from '@/shared/config'

/**
 * Autentica via `POST /auth/token` e retorna o access token.
 *
 * Usa fetch dedicado (e não o httpClient compartilhado) porque o 401 aqui
 * significa "credenciais inválidas" — não "sessão expirada" — e não deve
 * disparar o fluxo global de logout.
 */
export async function loginRequest(email: string, senha: string): Promise<string> {
  const res = await fetch(`${getApiUrl()}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
  if (!res.ok) throw new Error('Credenciais inválidas')
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}
