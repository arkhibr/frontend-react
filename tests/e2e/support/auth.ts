import type { Page } from '@playwright/test'

// JWT de teste aceito pelos handlers MSW. { sub: 'user1', exp: 9999999999 }
export const E2E_TOKEN =
  'eyJhbGciOiJSUzI1NiJ9' +
  '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ' +
  '.signature'

/** Autentica pelo formulário de login (requer MSW ativo para `POST /auth/token`). */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/e-mail/i).fill('usuario@teste.com')
  await page.getByLabel(/senha/i).fill('senha123')
  await page.getByRole('button', { name: 'Entrar' }).click()
}

/**
 * Semeia uma sessão ativa direto no sessionStorage (o store hidrata no boot).
 * Útil quando o Service Worker está bloqueado e o MSW não responde ao login.
 */
export async function seedSession(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    sessionStorage.setItem('portal_access_token', token)
  }, E2E_TOKEN)
}
