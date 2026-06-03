import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: (process.env.VERCEL || process.env.RENDER || process.env.NETLIFY) ? 'dist' : '../GoodTrack.API/wwwroot',
    emptyOutDir: true, // clear directory before building
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5244',
        changeOrigin: true,
      }
    }
  }
})
