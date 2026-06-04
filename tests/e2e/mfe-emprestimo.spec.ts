import { test, expect } from '@playwright/test'
import { signIn } from './support/auth'

// Prova de extensibilidade: o MFE de empréstimo foi adicionado apenas via
// manifesto (+ mock dev), sem tocar o shell nem o MFE de endereço. Aqui ele
// carrega dinamicamente do bucket S3 e funciona ponta a ponta.
test('carrega o MFE de empréstimo dinamicamente e registra a simulação', async ({ page }) => {
  await signIn(page)
  await expect(page).toHaveURL(/\/dashboard/)

  await page.getByRole('link', { name: /Simulação de Empréstimo/ }).click()
  await expect(page).toHaveURL(/\/emprestimo/)

  // O bundle vem do bucket S3 (LocalStack) e monta dentro da <div data-mfe="emprestimo">
  const host = page.locator('[data-mfe="emprestimo"]')
  await expect(host.getByLabel(/Valor/i)).toHaveValue('10000')

  await host.getByLabel(/Parcelas/i).fill('24')
  await host.getByRole('button', { name: /Simular/i }).click()
  await expect(host.getByRole('status')).toHaveText(/registrada/i)
})

test('os dois MFEs aparecem no menu do shell', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('link', { name: /Alteração de Endereço/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Simulação de Empréstimo/ })).toBeVisible()
})
