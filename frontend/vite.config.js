import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 5173,
    watch: {
      usePolling: false, // ubah ke false untuk Windows Native agar HMR lebih responsif
    },
    proxy: {
      '/api':          { target: 'http://localhost:3000', changeOrigin: true },
      '/logout':       { target: 'http://localhost:3000', changeOrigin: true },
      '/generate-pdf': { target: 'http://localhost:3000', changeOrigin: true },
      '/print-pdf':    { target: 'http://localhost:3000', changeOrigin: true },
      '/pdfs':         { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
