// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'perf-setup',
      testDir: './tests/perf',
      testMatch: /perf\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'perf',
      testDir: './tests/perf',
      testMatch: '**/*.perf.ts',
      retries: 0,
      fullyParallel: false,
      workers: 1,
      dependencies: ['perf-setup'],
      // Carga a frio sob redes lentas (Slow 3G): a navegação pode passar dos
      // 30s padrão, então afrouxamos só aqui para não falhar no goto.
      use: { ...devices['Desktop Chrome'], navigationTimeout: 120_000 },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
      },
})
