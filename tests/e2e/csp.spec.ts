import { test, expect } from '@playwright/test'

test('dev serve CSP Report-Only com Trusted Types e diretivas-chave', async ({ page }) => {
  const resp = await page.goto('/')
  const csp = resp?.headers()['content-security-policy-report-only'] ?? ''
  expect(csp).toContain("default-src 'none'")
  expect(csp).toContain("require-trusted-types-for 'script'")
  expect(csp).toContain('report-to csp-endpoint')
})
