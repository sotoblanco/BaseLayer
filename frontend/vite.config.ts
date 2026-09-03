import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access from Docker host
    host: true,
    proxy: {
      // In Docker, the backend is at http://backend:8000
      // Outside Docker (local dev), it's at http://localhost:8000
      // The VITE_API_URL env var controls this.
      '/courses': process.env.VITE_API_URL || 'http://localhost:8000',
      '/file-courses': process.env.VITE_API_URL || 'http://localhost:8000',
      '/run': process.env.VITE_API_URL || 'http://localhost:8000',
      '/ai': process.env.VITE_API_URL || 'http://localhost:8000',
      '/auth': process.env.VITE_API_URL || 'http://localhost:8000',
      '/token': process.env.VITE_API_URL || 'http://localhost:8000',
      '/register': process.env.VITE_API_URL || 'http://localhost:8000',
    }
  }
})
