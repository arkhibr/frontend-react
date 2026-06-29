import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // `?raw` CSS imports are intercepted by vitest's `vitest:css-empty-post`
    // plugin and turned into `export default ""` unless the id matches
    // css.include. Including the `?raw` pattern makes vitest pass the import
    // through Vite's asset pipeline, which correctly reads and exports the
    // raw file content.
    css: { include: [/\.css\?raw$/] },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: ['src/mocks/**', 'src/test-setup.ts', 'src/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
