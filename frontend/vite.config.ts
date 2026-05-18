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
    hmr: { 
      overlay: false,
      port: 3000
    },
    watch: {
      usePolling: false  // Windows下使用原生文件监听
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
