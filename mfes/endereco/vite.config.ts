import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      formats: ['es'],
      fileName: () => 'endereco.js',
    },
    // React fica embutido no bundle (MFE autônomo) — NÃO marcar como external.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
