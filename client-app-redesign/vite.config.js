import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: (process.env.VERCEL || process.env.RENDER || process.env.NETLIFY) ? 'dist' : '../GoodTrack.API/wwwroot',
    emptyOutDir: true, // clear directory before building
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5244',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5244',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
