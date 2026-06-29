import { test, expect } from '@playwright/test'
import { signIn } from './support/auth'

test('jornada de empréstimo: lista → detalhe → simular → enviar proposta', async ({ page }) => {
  await signIn(page)
  await page.getByRole('link', { name: /Simulação de Empréstimo/ }).click()
  await expect(page).toHaveURL(/\/emprestimos/)

  const host = page.locator('[data-mfe="emprestimo"]')
  await expect(host.getByRole('heading', { name: /Empréstimos/i })).toBeVisible()
  await expect(host.getByText('123456-7')).toBeVisible()

  // detalhe
  await host.getByText('123456-7').click()
  await expect(host.getByText(/Crédito Pessoal/)).toBeVisible()
  await host.getByRole('button', { name: /Ver extrato/i }).click()
  await expect(host.getByText('Prestação mensal')).toBeVisible()

  // simulador (volta para a entrada antes)
  await host.getByRole('button', { name: /voltar/i }).click()
  await host.getByRole('button', { name: /voltar/i }).click()
  await host.getByRole('button', { name: /Simular novo empréstimo/i }).click()
  await host.getByRole('button', { name: /Refinanciamento Consignado/ }).click()
  await host.getByLabel(/Valor líquido/i).fill('10000')
  await host.getByLabel(/Parcelas/i).fill('24')
  await host.getByRole('button', { name: /Simular/i }).click()
  await expect(host.getByText(/CET/)).toBeVisible()
  await host.getByRole('button', { name: /Continuar para o termo/i }).click()
  await host.getByRole('button', { name: /Assinar e enviar/i }).click()
  await expect(host.getByRole('status')).toHaveText(/Proposta registrada/i)
})

test('os dois MFEs aparecem no menu do shell', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('link', { name: /Alteração de Endereço/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Simulação de Empréstimo/ })).toBeVisible()
})
