import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get the API host from environment variable or default to localhost
const apiHost = process.env.API_HOST || 'localhost'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: `http://${apiHost}:3000`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: `ws://${apiHost}:3000`,
        ws: true,
        changeOrigin: true
      }
    }
  }
})