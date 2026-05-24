import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('redireciona para dashboard após login válido', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'usuario@teste.com')
    await page.fill('[name="senha"]', 'senha123')
    await page.click('[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('exibe mensagem de erro para credenciais inválidas', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'invalido@teste.com')
    await page.fill('[name="senha"]', 'errado')
    await page.click('[type="submit"]')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('redireciona para /login quando acessa rota protegida sem autenticação', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redireciona para /dashboard quando acessa /login já autenticado', async ({ page, context }) => {
    // Simulate active session via sessionStorage
    await context.addInitScript(() => {
      sessionStorage.setItem(
        'portal_access_token',
        'eyJhbGciOiJSUzI1NiJ9' +
        '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ' +
        '.signature',
      )
    })
    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard')
  })
})
