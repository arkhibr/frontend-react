import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // Lib mode não substitui process.env.NODE_ENV; como o React vai embutido no
  // bundle (MFE autônomo), é preciso defini-lo ou o bundle quebra no browser
  // com "ReferenceError: process is not defined".
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
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
