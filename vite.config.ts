// vite.config.ts
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const CSP_NONCE_PLACEHOLDER = '**CSP_NONCE**'

// Em build, marca <script> e <style> com um placeholder de nonce que o Nginx
// substitui por um valor único por requisição (sub_filter + $request_id).
// apply: 'build' garante que o dev server (Report-Only) não receba o placeholder.
function cspNoncePlugin(): Plugin {
  return {
    name: 'csp-nonce-placeholder',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script(?![^>]*\bnonce=)/g, `<script nonce="${CSP_NONCE_PLACEHOLDER}"`)
        .replace(/<style(?![^>]*\bnonce=)/g, `<style nonce="${CSP_NONCE_PLACEHOLDER}"`)
    },
  }
}

export default defineConfig({
  plugins: [react(), cspNoncePlugin()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    headers: {
      'Content-Security-Policy-Report-Only': [
        "default-src 'none'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self' ws: http://localhost:4566",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "require-trusted-types-for 'script'",
        "trusted-types default",
        "report-to csp-endpoint",
      ].join('; '),
      'Reporting-Endpoints': 'csp-endpoint="/__csp-report"',
    },
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
