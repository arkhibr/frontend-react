// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // mfes/**, gateway/** e bffs/** têm seu próprio runner de teste (vitest por pacote); não rodar aqui.
    exclude: ['**/node_modules/**', 'tests/e2e/**', 'mfes/**', 'gateway/**', 'bffs/**'],
    // Micro-benchmarks de desempenho (vitest bench), escopados ao shell — cada
    // sub-pacote tem os seus. Rode com `npm run bench`.
    benchmark: {
      include: ['src/**/*.bench.ts'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [
        // Arquivos globais de setup/tipos
        'src/mocks/**',
        'src/test-setup.ts',
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        // Boot/entry — exercido somente por E2E (Playwright)
        'src/main.tsx',
        // Composição de rotas e providers — exercido somente por E2E
        'src/app/router/**',
        'src/app/providers/**',
        // Páginas — exercidas somente por E2E
        'src/pages/**',
        // Estilos globais
        'src/app/styles/**',
        // loadMfeModule: a linha testável (assertMfeModule) já é coberta via
        // loadMfeModule.test.ts; o dynamic import() real é intrinsecamente
        // não-testável em unidade
        'src/app/mfe/loadMfeModule.ts',
        // Singletons de configuração/composição sem lógica testável em unidade
        'src/shared/lib/featureFlags.ts',
        'src/shared/lib/queryClient.ts',
        'src/shared/lib/store/index.ts',
        // sessionMonitor usa setInterval + window events — coberto por E2E
        'src/shared/auth/sessionMonitor.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
