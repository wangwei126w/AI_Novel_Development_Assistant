import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      treeshake: false,
      output: {
        manualChunks: undefined
      }
    },
    minify: false
  },
  server: {
    port: 3000,
    hmr: { overlay: false },
    watch: {
      usePolling: true,
      interval: 100
    },
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
