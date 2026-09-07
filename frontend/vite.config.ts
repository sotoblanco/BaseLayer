import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access from Docker host
    host: true,
    proxy: {
      // In Docker, the backend is at http://backend:8000 (via VITE_API_URL).
      // Outside Docker (local dev), it's at http://127.0.0.1:8000.
      // NOTE: use an explicit IPv4 address, not "localhost", so the proxy
      // never resolves to ::1 where a stale container (e.g. an old
      // `docker compose` backend still publishing port 8000) can swallow
      // the connection and surface as "socket hang up".
      // The VITE_API_URL env var controls this.
      '/courses': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
      '/file-courses': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
      '/run': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
      '/ai': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
      '/auth': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
      '/token': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
      '/register': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
      '/me': process.env.VITE_API_URL || 'http://127.0.0.1:8000',
    }
  }
})
