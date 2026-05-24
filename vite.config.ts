// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (['react', 'react-dom', 'react-router-dom'].some((m) => id.includes(`node_modules/${m}/`))) return 'vendor'
          if (['@reduxjs/toolkit', 'react-redux', '@tanstack/react-query'].some((m) => id.includes(`node_modules/${m}/`))) return 'state'
          if (id.includes('node_modules/react-hook-form/')) return 'forms'
        },
      },
    },
  },
})
