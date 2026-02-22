import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all backend API routes to FastAPI on port 8000
      '/courses': 'http://localhost:8000',
      '/file-courses': 'http://localhost:8000',
      '/run': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/token': 'http://localhost:8000',
      '/register': 'http://localhost:8000',
    }
  }
})
