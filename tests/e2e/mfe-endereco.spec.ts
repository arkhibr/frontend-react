import { test, expect } from '@playwright/test'

test('carrega o MFE de endereço dinamicamente e salva', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.getByRole('link', { name: /Alteração de Endereço/ }).click()
  await expect(page).toHaveURL(/\/endereco/)

  // O bundle vem do bucket S3 (LocalStack) e monta dentro da <div data-mfe="endereco">
  const host = page.locator('[data-mfe="endereco"]')
  await expect(host.getByLabel(/Logradouro/i)).toHaveValue('Praça da Sé')

  await host.getByLabel(/Número/i).fill('42')
  await host.getByRole('button', { name: /Salvar/i }).click()
  await expect(host.getByRole('status')).toHaveText(/atualizado/i)
})

// Bloqueia o Service Worker (MSW) neste teste: com o SW ativo, o fetch do
// bundle parte do worker e o page.route do Playwright não o intercepta. Sem
// o SW, o page.route consegue abortar o bundle. O shell boota mesmo sem MSW
// (ver main.tsx) e o login não depende de mock.
test.describe('isolamento de falha', () => {
  test.use({ serviceWorkers: 'block' })

  test('shell sobrevive a um MFE que falha ao carregar', async ({ page }) => {
    // Bloqueia o bundle para simular bucket indisponível
    await page.route('**/mfe-endereco/endereco.js', (r) => r.abort())
    await page.goto('/login')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.getByRole('link', { name: /Alteração de Endereço/ }).click()
    await expect(page.getByRole('alert')).toContainText(/indisponível/i)
    // O menu (shell) continua presente
    await expect(page.getByRole('link', { name: 'Início' })).toBeVisible()
  })
})
