import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Browser code never calls localhost directly: /api is proxied server-side to the backend.
// Local dev: backend on 127.0.0.1:8000. Docker Compose: VITE_PROXY_TARGET=http://backend:8000
const target = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000'
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true,
    proxy: { '/api': { target, changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') } } },
  preview: { host: '0.0.0.0', port: 5173, allowedHosts: true }
})
